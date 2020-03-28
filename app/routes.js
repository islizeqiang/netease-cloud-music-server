const Router = require('koa-router');
const miscController = require('./controllers/misc');

const router = new Router();

router.get('/', miscController.getApiInfo);
router.get('/spec', miscController.getSwaggerSpec);
router.get('/status', miscController.healthcheck);

// 获取首页自动推荐相关

module.exports = router;
