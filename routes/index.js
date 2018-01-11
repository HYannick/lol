const uplCtrl = require('../controllers/uploadCtrl');
const searchCtrl = require('../controllers/searchCtrl');
module.exports = (app) => {
  /* GET home page. */
  app.get('/api', function(req,res,next) {
    res.json({hello: 'World ymp3'})
  })
  app.get('/api/preview', uplCtrl.previewSong);
  app.get('/api/search', searchCtrl.searchSong);
  app.post('/api/upload', uplCtrl.uploadSong);
}