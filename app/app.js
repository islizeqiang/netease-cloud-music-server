/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint no-underscore-dangle: 0 */
const Koa = require('koa');

// const logging = require('@kasa/koa-logging');
const requestId = require('@kasa/koa-request-id');
const apmMiddleware = require('./middlewares/apm');
const bodyParser = require('./middlewares/body-parser');
const cookieParser = require('./middlewares/cookie-parser');
const cors = require('./middlewares/cors');
const errorHandler = require('./middlewares/error-handler');
const corsConfig = require('./config/cors');
// const logger = require('./logger');
const router = require('./routes');

class App extends Koa {
  constructor(...params) {
    super(...params);

    // Trust proxy
    this.proxy = true;
    // Disable `console.errors` except development env
    this.silent = this.env !== 'development';

    this.servers = [];

    this._configureMiddlewares();
    this._configureRoutes();
  }

  _configureMiddlewares() {
    this.use(errorHandler());
    this.use(apmMiddleware());
    this.use(requestId());
    // this.use(
    //   logging({
    //     logger,
    //     overrideSerializers: false,
    //   }),
    // );

    this.use(cookieParser());

    this.use(
      bodyParser({
        enableTypes: ['json'],
        jsonLimit: '10mb',
      }),
    );

    this.use(
      cors({
        origins: corsConfig.origins,
        allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
      }),
    );
  }

  _configureRoutes() {
    // Bootstrap application router
    this.use(router.routes());
    this.use(router.allowedMethods());
  }

  listen(...args) {
    const server = super.listen(...args);
    this.servers.push(server);
    return server;
  }

  async terminate() {
    // TODO: Implement graceful shutdown with pending request counter
    this.servers.forEach((server) => {
      server.close();
    });
  }
}

module.exports = App;
