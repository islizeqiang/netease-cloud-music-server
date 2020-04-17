module.exports = () => {
  return async function cookieParser(ctx, next) {
    ctx.req.cookies = {};
    (ctx.req.headers.cookie || '').split(/\s*;\s*/).forEach((pair) => {
      const crack = pair.indexOf('=');
      if (crack < 1 || crack === pair.length - 1) return;
      ctx.req.cookies.cookies[decodeURIComponent(pair.slice(0, crack)).trim()] = decodeURIComponent(
        pair.slice(crack + 1),
      ).trim();
    });
    next();
  };
};
