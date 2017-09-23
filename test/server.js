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
const Readable = require('stream').Readable;

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

  describe('POST method tests', () => {

    context('When exists', () => {
      beforeEach(() => {
        fs.copySync(`${fixturesRoot}/small.png`,
         config.get('filesRoot') + '/small.png');
      });

      context('When small file size', () => {
        it('returns 409 & file not modified', done => {
          let mtime = fs.statSync(config.get('filesRoot') + '/small.png').mtime;

          let req = request.post(`${host}/small.png`, (err, response) => {
            if (err) return done(err);
            let newMtime = fs.statSync(config.get('filesRoot') + '/small.png').mtime;

            // eql compares dates the right way
            mtime.should.eql(newMtime);

            response.statusCode.should.be.equal(409);
            done();
          });

          fs.createReadStream(`${fixturesRoot}/small.png`).pipe(req);
        });

        context('When zero file size', () => {
          it('returns 409', done => {
            let req = request.post(`${host}/small.png`, (err, response) => {
              if (err) return done(err);

              response.statusCode.should.be.equal(409);
              done();
            });

            // emulate zero-file
            let stream = new Readable();

            stream.pipe(req);
            stream.push(null);

          });
        });

      });
    });

    context('When file too big', () => {
      it('returns 413 and no file appears', done => {

        let req = request.post(`${host}/big.png`, (err, response) => {
          response.statusCode.should.be.equal(413);
          setTimeout(() => {
            fs.existsSync(config.get('filesRoot') + '/big.png').should.be.false();
            done();
          }, 20);
        });

        fs.createReadStream(`${fixturesRoot}/big.png`).pipe(req);
      });
    });

    context("otherwise with zero file size", () => {
      it('returns 200 & file is uploaded', done => {
        let req = request.post(`${host}/small.png`, err => {
          if (err) return done(err);

          fs.statSync(config.get('filesRoot') + '/small.png').size.should.equal(0);

          done();
        });

        let stream = new Readable();

        stream.pipe(req);
        stream.push(null);

      });
    });

    context("otherwise", () => {

      it("returns 200 & file is uploaded", done => {
        let req = request.post(`${host}/small.png`, err => {
          if (err) return done(err);
          fs.readFileSync(config.get('filesRoot') + '/small.png').equals(
            fs.readFileSync(`${fixturesRoot}/small.png`)
          ).should.be.true();
          done();

        });

        fs.createReadStream(`${fixturesRoot}/small.png`).pipe(req);
      });
    });

  });
});
