// Đọc file replay .ayame của Idol Showdown.
// Dùng chung cho trình duyệt (trang upload) và server (Node) — chỉ dùng Uint8Array,
// DataView, TextDecoder nên chạy được ở cả hai nơi.
//
// Định dạng là dump của .NET BinaryWriter (xem GameDemo.Serialize trong game):
//   số nguyên little-endian, string = độ dài varint 7-bit + byte UTF-8,
//   enum được ghi dưới dạng tên (string). Không có magic, không nén, không checksum.

export const MAX_REPLAY_BYTES = 40 * 1024 * 1024;

export class AyameFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AyameFormatError';
  }
}

const decoder = new TextDecoder('utf-8');

class Reader {
  constructor(bytes, offset = 0) {
    this.u8 = bytes;
    this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.o = offset;
  }

  need(n) {
    if (this.o + n > this.u8.length) throw new AyameFormatError('truncated');
  }

  i32() {
    this.need(4);
    const v = this.dv.getInt32(this.o, true);
    this.o += 4;
    return v;
  }

  skip(n) {
    this.need(n);
    this.o += n;
  }

  strLength(max) {
    let n = 0;
    let shift = 0;
    let b;
    do {
      this.need(1);
      b = this.u8[this.o++];
      n += (b & 0x7f) * 2 ** shift;
      shift += 7;
      if (shift > 35) throw new AyameFormatError('bad string length');
    } while (b & 0x80);
    if (n > max) throw new AyameFormatError('string too long');
    this.need(n);
    return n;
  }

  str(max = 64 * 1024) {
    const n = this.strLength(max);
    const s = decoder.decode(this.u8.subarray(this.o, this.o + n));
    this.o += n;
    return s;
  }

  skipStr() {
    const n = this.strLength(1024 * 1024);
    this.o += n;
  }
}

const ENUM_RE = /^[A-Za-z0-9_]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function enumValue(r, field) {
  const v = r.str(64);
  if (!ENUM_RE.test(v)) throw new AyameFormatError(`bad ${field}`);
  return v;
}

// gameRules là JSON của Unity JsonUtility, key có dạng "<TimeLimit>k__BackingField".
function parseRules(json) {
  const rules = {};
  try {
    const raw = JSON.parse(json);
    for (const [key, value] of Object.entries(raw)) {
      const m = /^<(\w+)>k__BackingField$/.exec(key);
      if (m) rules[m[1][0].toLowerCase() + m[1].slice(1)] = value;
    }
  } catch {
    // Luật không đọc được thì bỏ qua — không ảnh hưởng tới việc chia sẻ file.
  }
  return rules;
}

// Header thay đổi theo phiên bản game:
//   >= 5.1 : có debugFrameCount và fightInfo
//   5.0.x  : có debugFrameCount, chưa có fightInfo
//   4.x    : chưa có cả hai
const LAYOUTS = [
  { debugFrames: true, fightInfo: true },
  { debugFrames: true, fightInfo: false },
  { debugFrames: false, fightInfo: false },
];

// Đọc phần header. Trả về { meta, bodyOffset }.
// Ném AyameFormatError('truncated') nếu `bytes` chưa chứa hết header.
export function parseHeader(bytes) {
  let firstError = null;
  for (const layout of LAYOUTS) {
    try {
      return parseHeaderLayout(bytes, layout);
    } catch (err) {
      if (!(err instanceof AyameFormatError)) throw err;
      firstError ??= err;
    }
  }
  throw firstError;
}

function parseHeaderLayout(bytes, layout) {
  const r = new Reader(bytes);
  const meta = {};
  meta.startTime = r.str(64);
  meta.endTime = r.str(64);
  meta.gameVersion = r.str(256);
  meta.frameCount = r.i32();
  meta.debugFrameCount = layout.debugFrames ? r.i32() : 0;
  meta.gameMode = enumValue(r, 'gameMode');
  meta.p1 = { character: enumValue(r, 'p1Character'), collab: enumValue(r, 'p1Collab'), cosplay: r.i32() };
  meta.p2 = { character: enumValue(r, 'p2Character'), collab: enumValue(r, 'p2Collab'), cosplay: r.i32() };
  meta.stage = enumValue(r, 'stage');
  meta.stageVariant = r.i32();
  meta.song = r.i32();
  meta.fightInfo = layout.fightInfo ? r.str(1024) : '';
  const rulesJson = r.str(4096);
  if (!rulesJson.startsWith('{')) throw new AyameFormatError('bad rules');
  meta.rules = parseRules(rulesJson);
  meta.gameStateType = r.str(256);
  meta.p1.wins = r.i32();
  meta.p2.wins = r.i32();
  meta.p1.name = r.str(256);
  meta.p2.name = r.str(256);
  const marks = r.i32();
  if (marks < 0 || marks > 200) throw new AyameFormatError('bad round marks');
  meta.roundStartMarks = [];
  for (let i = 0; i < marks; i++) meta.roundStartMarks.push(r.i32());

  if (!DATE_RE.test(meta.startTime) || !DATE_RE.test(meta.endTime)) throw new AyameFormatError('bad date');
  if (!meta.gameVersion.includes('ver:')) throw new AyameFormatError('bad version');
  if (!meta.gameStateType.includes('GameState')) throw new AyameFormatError('bad state type');
  if (meta.frameCount <= 0 || meta.frameCount > 10_000_000) throw new AyameFormatError('bad frame count');
  if (meta.debugFrameCount < 0 || meta.debugFrameCount > 50_000_000) throw new AyameFormatError('bad debug frame count');
  if (meta.p1.wins < 0 || meta.p2.wins < 0 || meta.p1.wins > 99 || meta.p2.wins > 99) throw new AyameFormatError('bad wins');

  return { meta, bodyOffset: r.o };
}

// Thông báo lỗi tiếng Việt cho người dùng.
export function describeError(err) {
  if (!(err instanceof AyameFormatError)) return 'Không đọc được file.';
  if (err.message === 'bad frame count' || err.message === 'bad state type') {
    return 'Replay rỗng hoặc bị hỏng (game lưu khi trận chưa kịp bắt đầu).';
  }
  return 'File này không phải replay của Idol Showdown, hoặc đã bị hỏng.';
}

// Đọc header từ một File/Blob trong trình duyệt mà không tải cả file vào bộ nhớ.
export async function readHeaderFromBlob(blob) {
  for (const size of [16 * 1024, 1024 * 1024]) {
    const bytes = new Uint8Array(await blob.slice(0, size).arrayBuffer());
    try {
      return parseHeader(bytes).meta;
    } catch (err) {
      if (!(err instanceof AyameFormatError) || err.message !== 'truncated' || bytes.length < size) throw err;
    }
  }
  throw new AyameFormatError('header too large');
}

// Dấu vân tay để nhận ra một replay đã được đăng hay chưa mà không phải băm cả file
// (thư mục Archive có thể có hàng nghìn file 5MB). Phần đầu file chứa giờ bắt đầu/kết thúc
// tính tới giây, tên người chơi và các frame đầu — đủ để phân biệt hai trận khác nhau.
export const FINGERPRINT_BYTES = 64 * 1024;

export async function fingerprint(headBytes, totalSize) {
  const sizeBytes = new TextEncoder().encode(`|${totalSize}`);
  const data = new Uint8Array(headBytes.length + sizeBytes.length);
  data.set(headBytes);
  data.set(sizeBytes, headBytes.length);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const HP_RE = /HP: (-?[\d.]+)/;

// Đọc toàn bộ file và dựng lại kết quả từng round từ chuỗi trạng thái mà game ghi kèm
// mỗi frame (PVPDemoRecorder.MakeLog: "FR: .. X: .. HP: .. SM: .."). Round được tách theo
// diễn biến máu: round mới bắt đầu khi máu cả hai người được hồi đầy trở lại. Cách này
// đáng tin hơn roundStartMarks, vốn có thể thiếu mốc ở replay online.
export function summarize(bytes) {
  const { meta, bodyOffset } = parseHeader(bytes);
  const r = new Reader(bytes, bodyOffset);
  const mainLength = r.i32();
  if (mainLength < 0) throw new AyameFormatError('bad body length');
  r.need(mainLength);
  const mainEnd = r.o + mainLength;

  const readHp = () => {
    const m = HP_RE.exec(r.str(4096));
    return m ? Number(m[1]) : NaN;
  };

  const frames = new Int32Array(meta.frameCount);
  const hps1 = new Float32Array(meta.frameCount);
  const hps2 = new Float32Array(meta.frameCount);
  let count = 0;
  let records = 0;
  while (r.o < mainEnd && records < meta.frameCount) {
    const frame = r.i32();
    const inputs = r.i32();
    if (inputs < 0 || inputs > 8) throw new AyameFormatError('bad input count');
    r.skip(inputs * 8);
    const debugCount = r.i32();
    if (debugCount < 0 || debugCount > 8) throw new AyameFormatError('bad debug count');
    let hp1 = NaN;
    let hp2 = NaN;
    for (let i = 0; i < debugCount; i++) {
      if (i === 0) hp1 = readHp();
      else if (i === 1) hp2 = readHp();
      else r.skipStr();
    }
    records++;
    if (!Number.isFinite(hp1) || !Number.isFinite(hp2)) continue;
    frames[count] = frame;
    hps1[count] = hp1;
    hps2[count] = hp2;
    count++;
  }

  let max1 = NaN;
  let max2 = NaN;
  for (let i = 0; i < count; i++) {
    if (!(hps1[i] <= max1)) max1 = hps1[i];
    if (!(hps2[i] <= max2)) max2 = hps2[i];
  }

  // Một round chỉ có thể kết thúc sau khi có người bị hạ hoặc đã đủ thời gian để hết giờ.
  // Điều kiện này loại được trường hợp nhân vật hồi đầy máu giữa round.
  const timeLimit = meta.rules.isInfiniteTime ? Infinity : (meta.rules.timeLimit || 99) * FPS;
  const segments = [];
  let current = null;
  for (let i = 0; i < count; i++) {
    const hp1 = hps1[i];
    const hp2 = hps2[i];
    const frame = frames[i];
    if (current && hp1 >= max1 && hp2 >= max2
      && (current.hp1 <= 0 || current.hp2 <= 0 || frame - current.startFrame >= timeLimit)) {
      segments.push(current);
      current = null;
    }
    if (!current) current = { startFrame: frame, lastFrame: frame, hp1, hp2 };
    current.lastFrame = frame;
    // Bỏ qua cú nhảy máu lớn trong một frame: đó là lúc hồi máu chuyển round
    // (có thể lệch một frame giữa hai người chơi), không phải diễn biến trong round.
    if (hp1 - current.hp1 < max1 * 0.2) current.hp1 = hp1;
    if (hp2 - current.hp2 < max2 * 0.2) current.hp2 = hp2;
  }
  if (current && (current.hp1 < max1 || current.hp2 < max2 || !segments.length)) segments.push(current);

  const rounds = [];
  segments.forEach((seg, i) => {
    let winner = 0;
    let result = 'unfinished';
    const ko1 = seg.hp1 <= 0;
    const ko2 = seg.hp2 <= 0;
    const byPercent = () => (seg.hp1 / max1 === seg.hp2 / max2 ? 0 : seg.hp1 / max1 > seg.hp2 / max2 ? 1 : 2);
    if (ko1 && ko2) result = 'double';
    else if (ko1 || ko2) {
      result = 'ko';
      winner = ko2 ? 1 : 2;
    } else if (i < segments.length - 1) {
      // Round kết thúc mà không ai bị hạ → hết giờ.
      result = 'timeout';
      winner = byPercent();
    } else {
      // Round cuối không có KO: là hết giờ nếu tỉ số trong file còn thiếu một trận thắng,
      // ngược lại là trận bị bỏ dở (rời trận, mất kết nối...).
      const decided = rounds.filter((x) => x.winner).length;
      if (meta.p1.wins + meta.p2.wins > decided) {
        result = 'timeout';
        winner = byPercent();
      }
    }
    rounds.push({
      round: i + 1,
      startFrame: seg.startFrame,
      frames: seg.lastFrame - seg.startFrame + 1,
      hp1: Math.max(0, seg.hp1),
      hp2: Math.max(0, seg.hp2),
      winner,
      result,
    });
  });

  return {
    meta,
    maxHp: [Number.isFinite(max1) ? max1 : null, Number.isFinite(max2) ? max2 : null],
    rounds,
  };
}

// ---- Tên hiển thị -------------------------------------------------------------

const CHARACTER_NAMES = {
  FUBUKI: 'Fubuki', AKI: 'Aki', AYAME: 'Ayame', BOTAN: 'Botan', COCO: 'Coco',
  KORONE: 'Korone', SORA: 'Sora', SUISEI: 'Suisei', PEKORA: 'Pekora', OLLIE: 'Ollie',
  INA: "Ina'nis", ERRORSORA: 'Error Sora', FLAYON: 'Flayon', KRONII: 'Kronii',
  KUROKAMI: 'Kurokami', KOYORI: 'Koyori', BIJOU: 'Bijou',
};

const COLLAB_NAMES = {
  AME: 'Ame', AZKI: 'AZKi', MIKO: 'Miko', ROBOCO: 'Roboco', MARINE: 'Marine',
  IROHA: 'Iroha', RISU: 'Risu', KANATA: 'Kanata', MIO: 'Mio', KIARA: 'Kiara',
  MOONA: 'Moona', KAELA: 'Kaela', SUBARU: 'Subaru', FAUNA: 'Fauna', FLAYON: 'Flayon',
  KRONII: 'Kronii',
};

const STAGE_NAMES = {
  MOONLIT_GATES: 'Moonlit Gates', MIDNIGHT_ROSE: 'Midnight Rose', GANG_CITY: 'Gang City',
  MAIN_STAGE: 'Main Stage', ETERNITY_BRIGHT: 'Eternity Bright', AQUAMARINE: 'Aquamarine',
  KINGWORLD: 'Kingworld', OFFICE: 'Office', KRONII: 'Clock Tower', BEACH: 'Everlasting Beach',
};

const MODE_NAMES = { localPVP: 'Local', onlinePVP: 'Online' };

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export const CHARACTERS = Object.keys(CHARACTER_NAMES);
export const STAGES = Object.keys(STAGE_NAMES);

export const characterName = (v) => CHARACTER_NAMES[v] || titleCase(v) || '?';
export const collabName = (v) => COLLAB_NAMES[v] || titleCase(v) || '—';
export const stageName = (v) => STAGE_NAMES[v] || titleCase(v) || '?';
export const modeName = (v) => MODE_NAMES[v] || v;

// "ARCADE MODE - ver:6.0.2" -> "6.0.2"
export function versionNumber(gameVersion) {
  const m = /ver:\s*(\S+)/.exec(gameVersion || '');
  return m ? m[1] : gameVersion || '';
}

export function compareVersions(a, b) {
  const pa = versionNumber(a).split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  const pb = versionNumber(b).split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export const FPS = 60;

// Tên file theo đúng kiểu game tự đặt (DemoManagerSaveOperation):
// <5 ký tự>_[P1_|P2_]<Stage>_<P1>_VS_<P2>_.ayame
export function gameStyleFileName(meta, prefix) {
  const clean = (s) => String(s).replace(/[^A-Za-z0-9]/g, '');
  return `${clean(prefix).slice(0, 5)}_${clean(stageName(meta.stage))}_${clean(characterName(meta.p1.character))}_VS_${clean(characterName(meta.p2.character))}_.ayame`;
}
