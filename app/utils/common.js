// 获取数组中随机一项
exports.sample = arr => {
  if (Array.isArray(arr)) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  return null;
};
