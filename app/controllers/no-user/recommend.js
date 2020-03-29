const neteaseRequest = require('../../utils/request');

// 推荐歌单
exports.personalized = ctx => {
  const { query = {} } = ctx;
  const data = {
    limit: query.limit || 30,
    total: true,
    n: 1000,
  };
  return neteaseRequest('POST', `https://music.163.com/weapi/personalized/playlist`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
  });
};
