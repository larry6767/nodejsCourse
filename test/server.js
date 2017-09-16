const server = require('../server');
const request = require('request');
const fs = require('fs');
const assert = require('assert');

describe('server test', () => {
  let app;
  before((done) => {
    app = server.listen(3000, done);
  });

  after((done) => {
    app.close(done);
  });

  describe('GET method tests', () => {
    it('should return index.html', (done) => {
      request('http://localhost:3000', function(error, response, body) {
        if (error) return done(error);

        const file = fs.readFileSync('public/index.html', {encoding: 'utf-8'});
        assert.equal(response.headers['content-type'], 'text/html');
        assert.equal(body, file);

        done();
      });
    });
  });
});
