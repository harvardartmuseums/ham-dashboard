var express = require('express');
var router = express.Router();
var fetch = require('node-fetch');
var async = require('async');
var stats = require('../modules/data')

const API_KEY = process.env['API_KEY'];
const APP_TITLE = 'TMS Dashboard';

let data = {
  objects: {
    recordcount: 0,
    onview: 0
  },
  exhibitions: {
      current: []
  }
};


/* GET environment specific page. */
router.get('/:env', function(req, res, next) {  
  res.render(req.params.env, { title: APP_TITLE });
});

/* GET home page. */
router.get('/', function(req, res, next) {

  async.series([
    function(callback) {
        const url = `https://api.harvardartmuseums.org/object?apikey=${API_KEY}&size=0&q=accesslevel:1`;
        fetch(url)
          .then(response => response.json())
          .then(results => {
              callback(null, results['info']['totalrecords']);
            });
            
    },
    function(callback) {
        const url = `https://api.harvardartmuseums.org/object?apikey=${API_KEY}&size=0&gallery=any`;
        fetch(url)
          .then(response => response.json())
          .then(results => {
              callback(null, results['info']['totalrecords']);
            });
            
    },
    function(callback) {
        const url = `https://api.harvardartmuseums.org/exhibition?apikey=${API_KEY}&venue=HAM&status=current`;
        fetch(url)
          .then(response => response.json())
          .then(results => {
              callback(null, results['records']);
            });
            
    }  
  ],
      function(err, results) {
          data.objects.recordcount = results[0];
          data.objects.onview = results[1];
          data.exhibitions.current = results[2];

          res.render('production', { title: APP_TITLE, apistats: data });
      }
  );

});

module.exports = router;
