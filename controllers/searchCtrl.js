const ytSearch = require('youtube-search')
module.exports = {
  searchSong(req, res, next) {
    const {item} = req.query;
    const opts = {
      maxResults: 10,
      key: 'AIzaSyDPY75GaIBzt5P3p1ULzNehW9TQ4JdHBOI'
    };
    ytSearch(item, opts, function (err, results) {
      if (err) return console.log(err);
      console.log(results);
      res.json({results})
    })
  }
}