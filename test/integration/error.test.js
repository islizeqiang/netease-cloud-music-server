const supertest = require('supertest');
const app = require('../../app');

const server = app.listen();

afterAll(async () => {
  await app.terminate();
});

describe('Error', () => {
  const request = supertest(server);

  describe('UNKNOWN_ENDPOINT', () => {
    it('<404> should reject the request with no-exist API endpoint', async () => {
      const testCases = ['/unknown', '/api/what', '/api/41-2929', '/a/../api/../412929/kasa'];
      const promises = testCases.map((path) =>
        request.get(path).expect('Content-Type', /json/).expect(404),
      );
      const results = await Promise.all(promises);
      results.forEach((res) => {
        const { status, code, data, message } = res.body;
        expect(status).toBe('fail');
        expect(code).toBe('UNKNOWN_ENDPOINT');
        expect(data).toBeNull();
        expect(message).toBe('The requested endpoint does not exist.');
      });
    });
  });

  describe('INVALID_REQUEST_BODY_FORMAT', () => {
    it('<422> should reject the request body with invalid JOSN format', async () => {
      const testCases = [
        ['/', 'a[]'],
        ['/users', '{[}]'],
        ['/users/me', '1+1'],
      ];

      const promises = testCases.map(([path, body]) =>
        request
          .post(path)
          .set('Content-Type', 'application/json')
          .send(body)
          .expect('Content-Type', /json/)
          .expect(422),
      );

      const results = await Promise.all(promises);

      results.forEach((res) => {
        const { status, code, data, message } = res.body;
        expect(status).toBe('fail');
        expect(code).toBe('INVALID_REQUEST_BODY_FORMAT');
        expect(data).toBeNull();
        expect(message).toBe('The request body has invalid format.');
      });
    });
  });
});
