const uplCtrl = require('../controllers/uploadCtrl');
module.exports = (app) => {
  /* GET home page. */
  app.get('/api', function(req,res,next) {
    res.json({hello: 'World ymp3'})
  })
  app.get('/api/preview', uplCtrl.previewSong);
  app.post('/api/upload', uplCtrl.uploadSong);
}