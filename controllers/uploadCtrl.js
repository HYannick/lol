const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const cloudinary = require('cloudinary');
let ioSocket = null;
cloudinary.config({
  cloud_name: 'ayho-society',
  api_key: '387412896244547',
  api_secret: '4Vvzfyeq1Y7TF8lNeZA8bN7jvwc'
});

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
    ytdl.getInfo(url, (err, info) => {
      if (err) {
        res.json({message: 'Failed to load the video'})
      }
      res.json({img: `${parseThumbnail(info.thumbnail_url)}/maxresdefault.jpg`, title: info.title});
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
                const percent = (audioFileSizeInBytes / fileSizeInBytes) * 100;
                ioSocket.emit('downloading', percent)
              });
            })
            .on('end', () => {
              ioSocket.emit('downloading', 100)
              cloudinary.v2.uploader.upload(audioOutput, {resource_type: "video", use_filename: true, unique_filename: false}, function(err, result) {
                if(err) {
                  res.json({error: err})
                }
                fs.unlink(mainOutput, err => {
                  if (err) console.error(err);
                  else console.log('\nfinished downloading!');
                });
                fs.unlink(audioOutput, err => {
                  if (err) console.error(err);
                  else console.log('\nfinished downloading!');
                });
                res.json({downloadUrl: result.url})
              });
            })
            .save(audioOutput)
        })
    })
  }
}