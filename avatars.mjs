// Keep photos small enough for the existing local ledger and its JSON backups.
export const MAX_AVATAR_LENGTH = 120000;
export function isAvatar(value) {
  return typeof value === 'string' && value.length <= MAX_AVATAR_LENGTH && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export function checkPhoto(file) {
  if (!file || file.size <= 0) throw Error('请先选择一张照片');
  if (file.size > 20 * 1024 * 1024) throw Error('照片不能超过 20 MB，请选择较小的照片');
  if (file.type && !/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type)) {
    throw Error('请选择照片，支持 JPG、PNG 等常见图片');
  }
}
export async function compressAvatar(file) {
  checkPhoto(file);
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    await new Promise((resolve, reject) => {
      picture.onload = resolve;
      picture.onerror = () => reject(Error('这张照片无法读取，请换一张 JPG 或 PNG 照片'));
      picture.src = url;
    });
    const side = Math.min(picture.naturalWidth, picture.naturalHeight);
    if (!side) throw Error('照片尺寸无效，请换一张照片');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw Error('当前浏览器无法处理照片，请用 Safari 打开');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 256, 256);
    context.drawImage(picture, (picture.naturalWidth - side) / 2, (picture.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    const result = canvas.toDataURL('image/jpeg', 0.8);
    if (!isAvatar(result)) throw Error('照片压缩失败，请换一张照片');
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
