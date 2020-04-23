const fetch = require('node-fetch');
const async = require('async');

const API_KEY = process.env['API_KEY'];

let data = {
    objects: {
      recordcount: 0,
      onview: 0
    },
    exhibitions: {
        current: []
    }
  };

module.exports = {
    getAPIStats: function() {
                
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

                return data;
            }
        );
          
    }
}