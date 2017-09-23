const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const config = require('config');
const mime = require('mime');

module.exports = http.createServer(function(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (err) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  if (~pathname.indexOf('\0')) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  let filename = pathname.slice(1);
  if (filename.includes('/') || filename.includes('..')) {
    res.statusCode = 400;
    res.end('Nested paths are not allowed');
    return;
  }

  switch (req.method) {
    case 'GET':
      if (pathname === '/') {
        sendFile(config.get('publicRoot') + '/index.html', res);
      } else {
        let filepath = path.join(config.get('filesRoot'), filename);
        sendFile(filepath, res);
      }
      break;
    case 'POST':
      if (!filename) {
        res.statusCode = 400;
        res.end('File not found');
      } else {
        let filepath = path.join(config.get('filesRoot'), filename);
        receiveFile(filepath, req, res);
      }
      break;
    case 'DELETE':
      let filepath = path.join(config.get('filesRoot'), filename);
      fs.unlink(filepath, (err) => {
        if (err !== null) {
          if (err.code === 'ENOENT') {
            res.statusCode = 404;
            res.end('File not found');
          } else {
            console.error(err);
            res.statusCode = 500;
            res.end('Internal error');
          }
        } else {
          res.statusCode = 200;
          res.end('File deleted');
        }
      });
      break;
    default:
      res.statusCode = 502;
  }
}).listen(3000);

/**
 * Writes a file to the specified path.
 * @param {string} filepath The path by which to place the file.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
function receiveFile(filepath, req, res) {
  if (req.headers['content-lenght'] > config.get('limitFileSize')) {
    res.statusCode = 413;
    res.end('File is too big');
    return;
  }
  let writeStream = fs.createWriteStream(filepath, {flags: 'wx'});
  let size = 0;

  writeStream
    .on('error', (err) => {
      if (err.code === 'EEXIST') {
        res.statusCode = 409;
        res.end('File already exists');
      } else {
        console.error(err);
        if (!res.headersSent) {
          res.writeHead(500, {'Connection': 'close'});
          res.write('Internal error');
        }
        res.end();
        fs.unlink(filepath, (err) => {
          console.error(err);
        });
      }
    })
    .on('close', () => {
      res.end('File upload completed');
    });

  req
    .on('close', () => {
      writeStream.destroy();
      fs.unlink(filepath, (err) => {
        console.error(err);
      });
    })
    .on('data', (chunk) => {
      size += chunk.lenght;
      if (size > config.get('limitFileSize')) {
        res.writeHead(413, 'Connection', 'close');
        res.end('File is too big');

        writeStream.destroy();
        fs.unlink(filepath, (err) => {
          console.error(err);
        });
      }
    });

  req.pipe(writeStream);
}

/**
 * Sends a file located on the specified path.
 * @param {string} filepath The path by which to place the file.
 * @param {object} res The response object.
 */
function sendFile(filepath, res) {
  let readStream = fs.createReadStream(filepath);

  readStream
    .on('error', (err) => {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not found');
      } else {
        console.error(err);
        if (!res.headersSent) {
          res.writeHead(500, {'Connection': 'close'});
          res.write('Internal error');
        }
        res.end();
      }
    })

    .on('open', () => {
      res.setHeader('content-type', mime.lookup(filepath));
    });

  res
    .on('close', () => {
      readStream.destroy();
    });

  readStream.pipe(res);
}
