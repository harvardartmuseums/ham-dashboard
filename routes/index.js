var express = require('express');
var router = express.Router();
var fetch = require('node-fetch');
var async = require('async');
var stats = require('../modules/data')

const API_KEY = process.env['API_KEY'];
const APP_TITLE = 'HAM Dashboard';

let data = {
  datafreshness: 0,
  dateoflastrefresh: "2000-01-01",
  dateoflastexport: "2000-01-01",
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
        const url = `https://api.harvardartmuseums.org/object?apikey=${API_KEY}&size=1&q=accesslevel:1`;
        fetch(url)
          .then(response => response.json())
          .then(results => {
              let e = new Date(results['records'][0]['lastupdate']);
              let d = new Date(results['records'][0]['lastupdate']);
              d.setHours(d.getHours() + 2);

              let output = {
                lastexport: e.toLocaleString('en-US', {timeZone: "America/New_York"}),
                lastrefresh: d.toLocaleString('en-US', {timeZone: "America/New_York"}),
                recordcount: results['info']['totalrecords'] 
              };

              callback(null, output);
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
          data.dateoflastrefresh = results[0]['lastrefresh'];
          data.dateoflastexport = results[0]['lastexport'];
          data.objects.recordcount = results[0]['recordcount'];
          data.objects.onview = results[1];
          data.exhibitions.current = results[2];

          // calculate the age of the data
          // freshness = number of hours old
          const now = new Date();
          const exportdate = new Date(data.dateoflastexport);
          const freshness = Math.round((now - exportdate)/3600000);
          data.datafreshness = freshness;

          res.render('production', { title: APP_TITLE, apistats: data });
      }
  );

});

module.exports = router;
