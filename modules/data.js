const fetch = require('node-fetch');
const querystring = require('querystring');
const { response } = require('express');

const API_KEY = process.env.API_KEY;

function makeURL(endpoint, parameters, aggregations) {
  const HAM_API_URL = 'https://api.harvardartmuseums.org';

  let qs = {
    apikey: API_KEY
  };

  if (parameters) {
    qs = {...qs, ...parameters};
  };

  if (aggregations) {
   qs.aggregation = JSON.stringify(aggregations);
  }

  return `${HAM_API_URL}/${endpoint}?${querystring.encode(qs)}`; 
}

function getObjectStats(callback) {
  const params = {
    size: 1, 
  };
  const aggs = {
    "by_accesslevel": {
      "terms": {
        "field": "accesslevel"
      }
    }
  };
  const url = makeURL('object', params, aggs);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        let e = new Date(results['records'][0]['lastupdate']);
        let d = new Date(results['records'][0]['lastupdate']);
        d.setHours(d.getHours() + 2);

        let output = {
          lastexport: e.toLocaleString('en-US', {timeZone: "America/New_York"}),
          lastrefresh: d.toLocaleString('en-US', {timeZone: "America/New_York"}),
          recordcount: results['info']['totalrecords'],
          recordcount_public: results['aggregations']['by_accesslevel']['buckets'][0]['doc_count']
        };

        callback(null, output);
      });
}

function getObjectsInGalleryStats(callback) {
  const params = {
    size: 0,
    gallery: 'any' 
  };
  const url = makeURL('object', params);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        callback(null, results['info']['totalrecords']);
    });
}

function getCurrentExhibitions(callback) {
  const params = {
    venue: 'HAM',
    status: 'current',
    sort: 'enddate',
    sortorder: 'asc'
  };
  const url = makeURL('exhibition', params);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        callback(null, results['records']);
      });        
}

function getUpcomingExhibitions(callback) {
  const params = {
    venue: 'HAM',
    status: 'upcoming',
    sort: 'begindate',
    sortorder: 'asc'
  };
  const url = makeURL('exhibition', params);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        callback(null, results['records']);
      });        
}

function getAltTextStats(callback) {
  const params = {
    size: 0,
    q: 'images.alttext:* AND accesslevel:1'
  };
  const url = makeURL('object', params);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        callback(null, results['info']['totalrecords']);
      });
}  

function getActivityStats(callback) {
  const params = {
    size: 1, 
    sort: 'activitycount',
    sortorder: 'desc'
  };
  const aggs = {
    "by_type": {
      "terms": {
        "field": "activitytype"
      }, 
      "aggs": {
        "objects_touched": {
          "cardinality": {
              "field": "objectid"
          }
        },
        "activity_stats": {
            "extended_stats": {
                "field": "activitycount"
            }
        },
        "date_stats": {
            "extended_stats": {
                "field": "date"
            }
        }
      }
    }
  };
  const url = makeURL('activity', params, aggs);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        let object = results['records'][0];
        let databuckets = results['aggregations']['by_type']['buckets'];
        let pageviews = databuckets.find(bucket => bucket.key === 'pageviews');

        let output = {
          pageviews: {
            objects: {
              count: pageviews['objects_touched']['value']
            },
            statsdates: {
              start: pageviews['date_stats']['min_as_string'].substr(0, 10),
              end: pageviews['date_stats']['max_as_string'].substr(0, 10)
            },
            singledaymostviews: {
              date: object['date'],
              activitycount: object['activitycount']
            }
          }
        };

        let objectUrl = makeURL(`object/${object['objectid']}`);
        fetch(objectUrl)
          .then(response => response.json())
          .then(results => {
            output.pageviews.singledaymostviews.object = results;

            callback(null, output);
          });
        
      });
}

function getKeyStats(callback) {  
  const params = {
    size: 0
  };
  const aggs = {
    "date_stats": {
        "extended_stats": {
            "field": "createdat"
        }
    }
  };
  const url = makeURL('key', params, aggs);

  fetch(url)
    .then(response => response.json())
    .then(results => {
      let output = {
        keys: {
          count: results.info.totalrecords,
          statsdates: {
            start: results.aggregations.date_stats.min_as_string,
            end: results.aggregations.date_stats.max_as_string
          },
        }
      };

      callback(null, output);
    });
}

module.exports = {
  getObjectStats: getObjectStats,
  getObjectsInGalleryStats: getObjectsInGalleryStats,
  getCurrentExhibitions: getCurrentExhibitions,
  getUpcomingExhibitions: getUpcomingExhibitions,
  getAltTextStats: getAltTextStats,
  getActivityStats: getActivityStats,
  getKeyStats: getKeyStats
};