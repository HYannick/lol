const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ytSearch = require('youtube-search');
let ioSocket = null;

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return 'n/a'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  if (i === 0) return `${bytes} ${sizes[i]})`
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}

function parseThumbnail(thumbnail) {
  const maxres_thumbnail = thumbnail.split('/')
  maxres_thumbnail.pop()
  return maxres_thumbnail.join('/')
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
    const opts = {
      maxResults: 1,
      key: 'AIzaSyDPY75GaIBzt5P3p1ULzNehW9TQ4JdHBOI'
    };
    ytSearch(url, opts, function (err, results) {
      if (err) return console.log(err);
      console.log(results[0]);
      res.json({img: results[0].thumbnails.medium.url, title: results[0].title});
    })
  },
  uploadSong(req, res, next) {
    const {url} = req.body;
    console.log('Log :: preview ->', url);
    ytdl.getInfo(url, (err, info) => {
      if (err) {
        res.json({message: 'Failed to format the video'})
      }
      const args = {
        format: 'mp3',
        bitrate: 128,
        seek: 0,
        duration: null
      }

      const mainOutput = path.resolve(__dirname, `${info.title}.mp3`);
      const audioOutput = path.resolve(__dirname, `audio/${info.title}.mp3`);
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
              console.log(progress)
              fs.stat(audioOutput, (err, stats) => {
                if (err) throw err;
                audioFileSizeInBytes = stats.size;
                const percent = (audioFileSizeInBytes/fileSizeInBytes) * 100;
                ioSocket.emit('downloading', percent)
              });
            })
            .on('end', () => {
              ioSocket.emit('downloading', 100)
              res.download(audioOutput, () => {
                if (err) {
                  console.log(err);
                }
                fs.unlink(mainOutput, err => {
                  if (err) console.error(err);
                  else console.log('\nfinished downloading!');
                });
                fs.unlink(audioOutput, err => {
                  if (err) console.error(err);
                  else console.log('\nfinished downloading!');
                });
              })
            })
            .save(audioOutput)
        })
    })
  }
}