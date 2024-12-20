const fetch = require('node-fetch');
const querystring = require('querystring');
const { response } = require('express');
const { DateTime } = require('luxon');

let charts;
import('./charts.mjs').then(c => {charts = c;})

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
          lastexport_raw: e,
          lastrefresh: d.toLocaleString('en-US', {timeZone: "America/New_York"}),
          lastrefresh_raw: d,
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
      let now = new Date();
      now = new Date(now.toUTCString());
  
      results['records'].forEach(r => {
          let enddate = new Date(`${r['enddate']} 00:00:00`);
          const diff = enddate.getTime() - now.getTime();
          r.days_left = Math.round(diff/86400000);
          r.enddate_long = enddate.toLocaleDateString('en-US', {weekday: 'long', year: "numeric", month: "long", day: "numeric",});
        });

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
      let now = new Date();
      now = new Date(now.toUTCString());

      results['records'].forEach(r => {
          let begindate = new Date(`${r['begindate']} 00:00:00`);
          const diff = begindate.getTime() - now.getTime();
          r.days_until_opening = Math.round(diff/86400000);          
          r.begindate_long = begindate.toLocaleDateString('en-US', {weekday: 'long', year: "numeric", month: "long", day: "numeric",});
      });

        callback(null, results['records']);
      });        
}

function getAltTextStats(callback) {
  const params = {
    size: 0,
    q: 'images.alttext:* AND accesslevel:1'
  };
  const aggs = {
    "by_division": {
      "terms": {
        "field": "division"
      }
    },
    "total_images" : { 
      "value_count" : { 
        "field" : "images.imageid" 
      } 
    }
  };

  const url = makeURL('object', params, aggs);

  fetch(url)
    .then(response => response.json())
    .then(results => {
        let output = {
          objects: {
            count: results['info']['totalrecords']
          },
          divisions: []
        };
        results.aggregations.by_division.buckets.forEach(division => {
          output.divisions.push(
            {
              name: division.key, 
              count: division.doc_count, 
              percent: ((division.doc_count/output.objects.count)*100).toFixed(1)
            }
          ) 
        });

        callback(null, output);
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
        },
        "by_object": {
          "terms": {
              "field": "objectid",
              "size": 5,
              "order": {
                  "totals": "desc"
              }
          },
          "aggs": {
              "totals": {
                  "sum": {
                      "field": "activitycount"
                  }
              }
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
            },
            alltimemostviews: {
              activitycount: pageviews['by_object']['buckets'][0]['totals']['value']
            }
          }
        };

        let objectUrl = makeURL(`object/${object['objectid']}`);

        fetch(objectUrl)
          .then(response => response.json())
          .then(results => {
            output.pageviews.singledaymostviews.object = results;


            let objectUrl = makeURL(`object/${pageviews['by_object']['buckets'][0]['key']}`);

            fetch(objectUrl)
              .then(response => response.json())
              .then(results => {
                output.pageviews.alltimemostviews.object = results;

              callback(null, output);
              });
          });
        
      });
}

function getFiveByFiveStats(callback) {
  let output = {};

  const lastWeek = DateTime.now().minus({weeks: 1});
  const startDate = DateTime.now().minus({weeks: 5}).startOf('week');
  const endDate = DateTime.now().minus({weeks: 1}).endOf('week');

  let params = {
    size: 0,
    q: "activitytype:pageviews"
  };

  let aggs = {
    "by_week": {
      "date_histogram": {
        "field": "date",
        "calendar_interval": "1w",
        "format": "yyyy-MM-dd",
        "min_doc_count": 0,
        "hard_bounds": {
          "min": startDate.toISODate(),
          "max": endDate.plus({days: 1}).toISODate()
        }
      },
      "aggs": {
        "by_object": {
          "terms": {
            "field": "objectid",
            "size": 5,
            "order": {
              "totals": "desc"
            }
          },
          "aggs": {
            "totals": {
              "sum": {
                "field": "activitycount"
              }
            }
          }
        }
      }
    }
  };
  
  const url = makeURL('activity', params, aggs);
  fetch(url)
    .then(response => response.json())
    .then(results => {
      let objects = results["aggregations"]["by_week"]["buckets"][0]["by_object"]["buckets"];
      let objectIdList = objects.map(o => o.key).join("|");

      params = {
        id: objectIdList,
        fields: "title,images,url"
      };

      let objectsUrl = makeURL("object", params);      
      
      fetch(objectsUrl)
        .then(response => response.json())
        .then(results => {

          objects.forEach(o => {
            o.data = results.records.find(r => r.id == o.key);
          })

          output = {
            dateRange: {
              start: startDate.toLocaleString('en-US', {timeZone: "America/New_York"}),
              end: endDate.toLocaleString('en-US', {timeZone: "America/New_York"})
            },
            objects: objects
          };

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
    },
    "keys_by_year": {
        "date_histogram": {
            "field": "createdat",
            "interval": "1y",
            "time_zone": "America/New_York"
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
          charts: {
            keys_by_year: ""
          }
        }
      };

      let data = [];
      let databucket = results.aggregations.keys_by_year.buckets;
      databucket.forEach(d => {
        let group = {
          year: parseInt(d.key_as_string.slice(0,4)),
          count: d.doc_count
        };
        data.push(group);
      });

      output.keys.charts.keys_by_year = charts.makeBarChart(data, "year", "count");

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
  getFiveByFiveStats: getFiveByFiveStats,
  getKeyStats: getKeyStats
};