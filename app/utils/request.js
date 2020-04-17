const request = require('request');
const PacProxyAgent = require('pac-proxy-agent');

const queryString = require('querystring');
const zlib = require('zlib');

const encrypt = require('./crypto');
const { mobileUserAgent, pcUserAgent } = require('../constants/constants');
const { sample } = require('./common');

// pre-push: 'npm run test'

// 分配用户代理
const chooseUserAgent = (ua) => {
  if (ua === 'mobile') {
    return sample(mobileUserAgent);
  }
  if (ua === 'pc') {
    return sample(pcUserAgent);
  }
  return sample([...mobileUserAgent, ...pcUserAgent]);
};

// 创建request方法
const createRequest = (method, url, data, options) => {
  return new Promise((resolve, reject) => {
    const headers = {};

    headers['User-Agent'] =
      options.crypto === 'linuxapi'
        ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
        : chooseUserAgent(options.ua);

    if (method.toUpperCase() === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    if (url.includes('music.163.com')) {
      headers.Referer = 'https://music.163.com';
    }

    if (options.cookie) {
      if (options.cookie instanceof Object) {
        headers.Cookie = Object.entries(options.cookie)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('; ');
      } else {
        headers.Cookie = options.cookie;
      }
    }

    let queryData = {};
    let queryUrl = '';

    if (options.crypto === 'weapi') {
      const csrfToken = (headers.Cookie || '').match(/_csrf=([^(;|$)]+)/);
      queryData = encrypt.weapi({ ...data, csrf_token: csrfToken ? csrfToken[1] : '' });

      queryUrl = url.replace(/\w*api/, 'weapi');
    } else if (options.crypto === 'linuxapi') {
      queryData = encrypt.linuxapi({
        method,
        url: url.replace(/\w*api/, 'api'),
        params: data,
      });

      queryUrl = 'https://music.163.com/api/linux/forward';
    } else if (options.crypto === 'eapi') {
      const cookie = options.cookie || {};
      const {
        __csrf,
        osver,
        deviceId,
        appver,
        versioncode,
        mobilename,
        buildver,
        resolution,
        os,
        channel,
      } = cookie;

      const eapiHeader = {
        // 系统版本
        osver,
        // encrypt.base64.encode(imei + '\t02:00:00:00:00:00\t5106025eb79a5247\t70ffbaac7')
        deviceId,
        // app版本
        appver: appver || '6.1.1',
        // 版本号
        versioncode: versioncode || '140',
        // 设备model
        mobilename,
        buildver: buildver || Date.now().toString().substr(0, 10),
        // 设备分辨率
        resolution: resolution || '1920x1080',
        __csrf: __csrf || '',
        os: os || 'android',
        channel,
        requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(4, '0')}`,
      };
      if (cookie.MUSIC_U) {
        eapiHeader.MUSIC_U = cookie.MUSIC_U;
      }
      if (cookie.MUSIC_A) {
        eapiHeader.MUSIC_A = cookie.MUSIC_A;
      }
      headers.Cookie = Object.entries(eapiHeader)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('; ');

      queryData = encrypt.eapi(options.url, { ...data, header: eapiHeader });
      queryUrl = url.replace(/\w*api/, 'eapi');
    }

    const settings = {
      headers,
      method,
      url: queryUrl,
      body: queryString.stringify(queryData),
    };

    if (options.crypto === 'eapi') {
      settings.encoding = null;
    }

    if (/\.pac$/i.test(options.proxy)) {
      settings.agent = new PacProxyAgent(options.proxy);
    } else {
      // settings.proxy = options.proxy;
      settings.proxy = 'http://127.0.0.1:12333';
    }

    const answer = { status: 500, body: {}, cookie: [] };

    request(settings, (err, res, body) => {
      if (err) {
        answer.status = 502;
        answer.body = { code: 502, msg: err.stack };
        reject(answer);
        return;
      }
      answer.cookie = (res.headers['set-cookie'] || []).map((x) =>
        x.replace(/\s*Domain=[^(;|$)]+;*/, ''),
      );
      try {
        if (options.crypto === 'eapi') {
          zlib.unzip(body, (error, b) => {
            const buffer = error ? body : b;
            try {
              try {
                answer.body = JSON.parse(encrypt.decrypt(buffer).toString());
                answer.status = answer.body.code || res.statusCode;
              } catch (e) {
                answer.body = JSON.parse(buffer.toString());
                answer.status = res.statusCode;
              }
            } catch (e) {
              answer.body = buffer.toString();
              answer.status = res.statusCode;
            }
            answer.status = answer.status > 100 && answer.status < 600 ? answer.status : 400;
            if (answer.status === 200) resolve(answer);
            else reject(answer);
          });
        }
        answer.body = JSON.parse(body);
        answer.status = answer.body.code || res.statusCode;
        if (answer.body.code === 502) {
          answer.status = 200;
        }
      } catch (e) {
        answer.body = body;
        answer.status = res.statusCode;
      }

      answer.status = answer.status > 100 && answer.status < 600 ? answer.status : 400;
      if (answer.status === 200) resolve(answer);
      else reject(answer);
    });
  });
};

module.exports = createRequest;
