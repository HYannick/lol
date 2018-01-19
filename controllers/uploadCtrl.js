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
    const mainOutput = path.resolve(__dirname, `./${title}.mp3`);

    ytdl.getInfo(url, (err, info) => {
      if (err) throw err;
      if (info.length_seconds > 900) {
        res.status(500).json({error: 'video too long bud\' :( '})
      } else {
        res.json({processing: 'processing ...'});
        const video = ytdl(url, {filter: 'audioonly'});
        let starttime;
        video.pipe(fs.createWriteStream(mainOutput));
        video.once('response', () => {
          starttime = Date.now();
        });
        video.on('progress', (chunkLength, downloaded, total) => {
          const floatDownloaded = downloaded / total;
          const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
          const data = {
            id,
            percent: (floatDownloaded * 100).toFixed(2),
            estimated: (downloadedMinutes / floatDownloaded - downloadedMinutes).toFixed(2)
          }
          ioSocket.emit('downloadingVideo', data)
        });
        video.on('end', () => {
          ffmpeg()
            .input(mainOutput)
            .format(args.format)
            .audioCodec('libmp3lame')
            .audioBitrate(args.bitrate)
            .on('error', err => {
              fs.unlink(audioOutput, err => {
                if (err) console.error(err);
                else console.log('Failed. File deleted =>', audioOutput);
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
                    else console.log('Success. File deleted =>', audioOutput);
                  });
                  fs.unlink(mainOutput, err => {
                    if (err) console.error(err);
                    else console.log('Success. File deleted =>', audioOutput);
                  });
                }, 2000);
              })
            })
            .save(audioOutput)
        });

      }
    })
  }
}