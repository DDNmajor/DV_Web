// Gọi REST API của server. Lỗi trả về dưới dạng ApiError có message tiếng Việt từ server.

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function request(method, url, body) {
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError(0, 'Không kết nối được tới máy chủ.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Lỗi ${res.status}`, data);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

let mePromise = null;
export function getMe() {
  mePromise ??= api.get('/api/auth/me').then((d) => d.user).catch(() => null);
  return mePromise;
}

// Upload bằng XHR để có tiến trình gửi (fetch chưa hỗ trợ).
export function uploadReplay(gzipBlob, params, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/replays?${new URLSearchParams(params)}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data.error || `Lỗi ${xhr.status}`, data));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Mất kết nối khi đang tải lên.'));
    xhr.send(gzipBlob);
  });
}
