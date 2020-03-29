const Router = require('koa-router');
const miscController = require('./controllers/misc');
const noUser = require('./controllers/no-user');

const router = new Router();

router.get('/', miscController.getApiInfo);
router.get('/spec', miscController.getSwaggerSpec);
router.get('/status', miscController.healthcheck);

// 获取不需要登录的相关接口
router.get('/personalized', noUser.recommend.personalized);

module.exports = router;
