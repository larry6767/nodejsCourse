const server = require('../server');
const host = 'http://127.0.0.1:3000';
const fixturesRoot = __dirname + '/fixtures';

const request = require('request-promise').defaults({
  encoding: null,
  simple: false,
  resolveWithFullResponse: true,
});

const fs = require('fs-extra');
const config = require('config');
const Readable = require('stream').Readable;

describe('Server', () => {
  before((done) => {
    server.listen(3000, '127.0.0.1', done);
  });

  after((done) => {
    server.close(done);
  });

  beforeEach(() => {
    fs.emptyDirSync(config.get('filesRoot'));
  });

  describe('GET method', () => {
    context('when file exist', () => {
      beforeEach(() => {
        fs.copySync(`${fixturesRoot}/small.png`,
         config.get('filesRoot') + '/small.png');
      });

      it('returns 200 & the file', async () => {
        const fixtureContent = fs.readFileSync(`${fixturesRoot}/small.png`);
        const response = await request.get(`${host}/small.png`);
        response.body.equals(fixtureContent).should.be.true();
      });
    });

    context('otherwise', () => {
      it('returns 404', async () => {
        const response = await request.get(`${host}/small.png`);
        response.statusCode.should.be.equal(404);
      });
    });
  });

  describe('GET /nested/path', () => {
    it('returns 400', async () => {
      const response = await request.get(`${host}/nested/path`);
      response.statusCode.should.be.equal(400);
    });
  });

  describe('POST method', () => {
    context('when file exists', () => {
      beforeEach(() => {
        fs.copySync(`${fixturesRoot}/small.png`,
         config.get('filesRoot') + '/small.png');
      });

      context('when small file size', () => {
        it('returns 409 & file not modified', async () => {
          const filePath = config.get('filesRoot') + '/small.png';
          const {mtime} = fs.statSync(filePath);
          const req = request.post(`${host}/small.png`);

          fs.createReadStream(`${fixturesRoot}/small.png`).pipe(req);

          const response = await req;

          const {mtime: newMtime} = fs.statSync(filePath);
          mtime.should.eql(newMtime);
          response.statusCode.should.be.equal(409);
        });

        context('when zero file size', () => {
          it('returns 409', async () => {
            const req = request.post(`${host}/small.png`);
            const stream = new Readable(); // emulate zero-file

            stream.pipe(req);
            stream.push(null);

            const response = await req;

            response.statusCode.should.be.equal(409);
          });
        });
      });
    });

    context('when file too big', () => {
      it('returns 413 and no file appears', async () => {
        const req = request.post(`${host}/big.png`);
        fs.createReadStream(`${fixturesRoot}/big.png`).pipe(req);

        try {
          response = await req;
        } catch (err) {
          // see ctx for description https://github.com/nodejs/node/issues/947#issue-58838888
          // there is a problem in nodejs with it
          if (err.cause && err.cause.code == 'EPIPE') return;

          throw err;
        }

        response.statusCode.should.be.equal(413);
        fs.existsSync(config.get('filesRoot') + '/big.png').should.be.false();
      });
    });

    context('otherwise with zero file size', () => {
      it('returns 200 & file is uploaded', async () => {
        const req = request.post(`${host}/small.png`);
        const stream = new Readable();
        const filePath = config.get('filesRoot') + '/small.png';

        stream.pipe(req);
        stream.push(null);

        const response = await req;

        response.statusCode.should.be.equal(200);
        fs.statSync(filePath).size.should.equal(0);
      });
    });

    context('otherwise', () => {
      it('returns 200 & file is uploaded', async () => {
        const req = request.post(`${host}/small.png`);
        fs.createReadStream(`${fixturesRoot}/small.png`).pipe(req);

        const response = await req;

        response.statusCode.should.equal(200);
        fs.readFileSync(config.get('filesRoot') + '/small.png').equals(
          fs.readFileSync(`${fixturesRoot}/small.png`)
        ).should.be.true();
      });
    });
  });
});
