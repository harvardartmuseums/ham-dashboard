var express = require('express');
var router = express.Router();
var async = require('async');
var stats = require('../modules/data');
const { stat } = require('fs');

const APP_TITLE = 'HAM Dashboard';

let data = {
  datafreshness: 0,
  dateoflastrefresh: "2000-01-01",
  dateoflastexport: "2000-01-01",
  keys: {
    count: 0,
    count_as_string: 0,
    statsdates: {}
  },
  objects: {
    count: 0,
    public: {
      count: 0,
      count_as_percent: 0
    },
    onview: {
      count: 0,
      count_as_percent: 0
    },
    alttext: {
      count: 0,
      count_as_percent: 0
    }
  },
  pageviews: {},
  exhibitions: {
      current: [],
      upcoming: []
  }
};

/* GET environment specific page. */
router.get('/:env', function(req, res, next) {  
  res.render(req.params.env, { title: APP_TITLE });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  
  async.parallel({
      objectStats: stats.getObjectStats,
      currentExhibitions: stats.getCurrentExhibitions,
      upcomingExhibitions: stats.getUpcomingExhibitions,
      alttextStats: stats.getAltTextStats,
      objectsOnViewStats: stats.getObjectsInGalleryStats,
      activityStats: stats.getActivityStats,
      keyStats: stats.getKeyStats
    },
    function(err, results) {
        data.dateoflastrefresh = results['objectStats']['lastrefresh'];
        data.dateoflastexport = results['objectStats']['lastexport'];
        data.objects.count = results['objectStats']['recordcount'];
        data.objects.count_as_string = data.objects.count.toLocaleString('en');
        data.objects.public.count = results['objectStats']['recordcount_public'];
        data.objects.public.count_as_string = data.objects.public.count.toLocaleString('en');
        data.objects.public.count_as_percent = ((results['objectStats']['recordcount_public']/results['objectStats']['recordcount'])*100).toFixed(2);
        data.objects.onview.count = results['objectsOnViewStats'];
        data.objects.onview.count_as_string = data.objects.onview.count.toLocaleString('en');
        data.objects.onview.count_as_percent = ((results['objectsOnViewStats']/results['objectStats']['recordcount'])*100).toFixed(2);
        data.exhibitions.current = results['currentExhibitions'];
        data.exhibitions.upcoming = results['upcomingExhibitions'];
        data.objects.alttext.count = results['alttextStats']['objects']['count'];
        data.objects.alttext.count_as_string = data.objects.alttext.count.toLocaleString('en');
        data.objects.alttext.count_as_percent = ((data.objects.alttext.count/data.objects.count)*100).toFixed(2);
        data.objects.alttext.by_division = results['alttextStats']['divisions'];
        data.pageviews = results['activityStats']['pageviews'];
        data.pageviews.objects.count_as_string = data.pageviews.objects.count.toLocaleString('en');
        data.pageviews.objects.count_as_percent = ((data.pageviews.objects.count/data.objects.public.count)*100).toFixed(2)
        data.keys.count = results['keyStats']['keys']['count'];
        data.keys.count_as_string = data.keys.count.toLocaleString('en');
        data.keys.statsdates = results['keyStats']['keys']['statsdates'];
        data.keys.statsdates.start_short = data.keys.statsdates.start.substr(0, 10);

        // calculate the age of the data
        // freshness = number of hours old
        let now = new Date();
        now = new Date(now.toUTCString());

        let exportdate = new Date(data.dateoflastexport);
        exportdate = new Date(exportdate.toUTCString());
        
        const freshness = Math.round((now - exportdate)/3600000);
        data.datafreshness = freshness;

        res.render('production', { title: APP_TITLE, apistats: data });
      }
    );
});

module.exports = router;
