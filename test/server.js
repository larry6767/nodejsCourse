const server = require('../server');
const host = 'http://127.0.0.1:3000';
const fixturesRoot = __dirname + '/fixtures';

const request = require('request').defaults({
  encoding: null
});
const rp = require('request-promise').defaults({
  encoding: null
});

const fs = require('fs-extra');
const assert = require('assert');
const config = require('config');

const should = require('should');
// make sure you run it in test env
// should(process.env.NODE_ENV).eql('test');

describe('server tests', () => {
  let app;
  before((done) => {
    app = server.listen(3000, done);
  });

  after((done) => {
    app.close(done);
  });

  beforeEach(() => {
    fs.emptyDirSync(config.get('filesRoot'));
  });

  describe('GET method tests', () => {
    context('When exist', () => {
      beforeEach(() => {
        fs.copySync(`${fixturesRoot}/small.png`,
         config.get('filesRoot') + '/small.png');
      });

      it('returns 200 & the file', async () => {
        let fixtureContent = fs.readFileSync(`${fixturesRoot}/small.png`);

        const response = await rp.get(`${host}/small.png`);
        response.equals(fixtureContent).should.be.true();
      });
    });

    context('otherwise', () => {
      it('returns 404', done => {

        request.get(`${host}/small.png`, (err, response) => {
          if (err) return done(err);
          response.statusCode.should.be.equal(404);
          done();
        });

      });
    });

  });

  describe('GET /nested/path', () => {
    it('returns 400', done => {

      request.get(`${host}/nested/path`, (error, response) => {
        if (error) return done(error);
        response.statusCode.should.be.equal(400);
        done();
      });

    });
  });

});
