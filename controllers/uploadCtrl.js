const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const moment = require('moment');
let ioSocket = null;

module.exports = {
  initCon(io) {
    ioSocket = io;
    io.on('connection', function (socket) {
      console.log('connected')
    })
  },
  uploadSong(req, res, next) {
    req.setTimeout(0)
    const {url, title, id} = req.body;
    console.log(title);
    console.log('Log :: preview ->', url);
    const args = {
      format: 'mp3',
      bitrate: 192,
      seek: 0,
      duration: null
    }

    const audioOutput = path.resolve(__dirname, `audio/${title}.mp3`);
    ytdl.getInfo(url, (err, info) => {
      if (err) throw err;
        res.json({ processing : 'processing ...'});
        ffmpeg()
          .input(ytdl(url, {filter: 'audioonly'}))
          .format(args.format)
          .audioCodec('libmp3lame')
          .audioBitrate(args.bitrate)
          .on('error', err => {
            fs.unlink(audioOutput, err => {
              if (err) console.error(err);
              else console.log('File deleted =>', audioOutput);
              ioSocket.emit('sendFileError', {id, status: 0})
            });
          })
          .on('progress', progress => {
            const currentTime = moment.duration(progress.timemark).asSeconds();
            const percent = (currentTime / info.length_seconds) * 100
            console.log(`Status => ${percent}%`)
            ioSocket.emit('downloading', {id, status: percent})
          })
          .on('end', () => {
            fs.readFile(audioOutput, (err, file) => {
              ioSocket.emit('sendFile', {id, status: 100, blob: file})
              setTimeout(() => {
                fs.unlink(audioOutput, err => {
                  if (err) console.error(err);
                  else console.log('File deleted =>', audioOutput);
                });
              }, 1000);
            })
          })
          .save(audioOutput)
      // }
    })
  }
}