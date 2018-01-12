const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ytSearch = require('youtube-search');
let ioSocket = null;
const opts = {
  maxResults: 1,
  key: 'AIzaSyDPY75GaIBzt5P3p1ULzNehW9TQ4JdHBOI'
};
function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return 'n/a'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  if (i === 0) return `${bytes} ${sizes[i]})`
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}

module.exports = {
  initCon(io) {
    ioSocket = io;
    io.on('connection', function (socket) {
      console.log('connected')
    })
  },
  previewSong(req, res, next) {
    const {url} = req.query;
    ytSearch(url, opts, function (err, results) {
      if (err) return console.log(err);
      res.json({img: results[0].thumbnails.medium.url, title: results[0].title});
    })
  },
  uploadSong(req, res, next) {
    const {url, title, id} = req.body;
    console.log(title);
    console.log('Log :: preview ->', url);
    const args = {
      format: 'mp3',
      bitrate: 128,
      seek: 0,
      duration: null
    }

    const mainOutput = path.resolve(__dirname, `${title}.mp3`);
    const audioOutput = path.resolve(__dirname, `audio/${title}.mp3`);
    ytdl(url, {filter: 'audioonly'})
      .pipe(fs.createWriteStream(mainOutput))
      .on('finish', () => {
        let fileSizeInBytes
        fs.stat(mainOutput, (err, stats) => {
          if (err) throw err;
          fileSizeInBytes = stats.size;
        });
        ffmpeg()
          .input(ytdl(url, {filter: 'audioonly'}))
          // .audioBitrate(args.bitrate)
          .format(args.format)
          .on('error', err => {
            res.json({message: 'Failed to format the video'})
          })
          .on('progress', progress => {
            let audioFileSizeInBytes;
            fs.stat(audioOutput, (err, stats) => {
              if (err) throw err;
              audioFileSizeInBytes = stats.size;
              const percent = (audioFileSizeInBytes/fileSizeInBytes) * 100;
              console.log(`Status => ${percent}%`)
              ioSocket.emit('downloading', {id, status: percent})
           });
          })
          .on('end', () => {
            ioSocket.emit('downloading', 100)
            res.download(audioOutput, (err) => {
              if (err) {
                console.log(err);
              }
              setTimeout(() => {
                fs.unlink(mainOutput, err => {
                  if (err) console.error(err);
                  else console.log('File deleted =>', mainOutput);
                });
                fs.unlink(audioOutput, err => {
                  if (err) console.error(err);
                  else console.log('File deleted =>', audioOutput);
                });
              }, 1000);
            })
          })
          .save(audioOutput)
      })
  }
}