var dbUrl = "https://spreadsheets.google.com/feeds/cells/1lQQpRjLBF_9rtDXgvON7-V-ow0szcd5OyVoRUJpPOS0/1/public/full?alt=json";
var dbGuideText = "https://spreadsheets.google.com/feeds/cells/1lQQpRjLBF_9rtDXgvON7-V-ow0szcd5OyVoRUJpPOS0/2/public/full?alt=json";
var unlabeledSuffix = ' (unlabeled)';
var cacheId = 'vpxyzcache';

var vpApp = angular.module('vpApp', ['ngRoute', 'ngAnimate']);

vpApp.directive("keepScrollPos", function($route, $window, $timeout, $location, $anchorScroll) {
  // cache scroll position of each route's templateUrl
  var scrollPosCache = {};

  // compile function
  return function(scope, element, attrs) {
    scope.$on('$routeChangeStart', function() {
      if ($route.current) // store scroll position for the current view
        scrollPosCache[$route.current.loadedTemplateUrl] = [$window.pageXOffset, $window.pageYOffset];
    });

    scope.$on('$routeChangeSuccess', function() {
      // if hash is specified explicitly, it trumps previously stored scroll position
      if ($location.hash())
        $anchorScroll();
      else { // else get previous scroll position; if none, scroll to the top of the page
        var prevScrollPos = scrollPosCache[$route.current.loadedTemplateUrl] || [ 0, 0 ];
        $timeout(function() {
        $window.scrollTo(prevScrollPos[0], prevScrollPos[1]);
        }, 0);
      }
    });
  };
});

vpApp.filter('bandcampEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('//bandcamp.com/EmbeddedPlayer/album=' + encodeURIComponent(id) + '/size=large/bgcol=333333/linkcol=0f91ff/artwork=none/transparent=true/');
    };
  })
  .filter('soundcloudPlaylistEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('//w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/' + encodeURIComponent(id) + '&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_artwork=false');
    };
  })
  .filter('soundcloudTrackEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('//w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/' + encodeURIComponent(id) + '&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_artwork=false');
    };
  })
  .filter('youtubeVideoEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('//www.youtube.com/embed/' + encodeURIComponent(id));
    };
  })
  .filter('spotifyEmbed', function($sce) {
    return function(url) {
      return $sce.trustAsResourceUrl('//open.spotify.com/embed?uri=' + encodeURIComponent(url));
    }
  })
  .filter('trustAsResourceUrl', function($sce) {
    return $sce.trustAsResourceUrl;
  })
  .filter('decodeURI', function() {
    return window.decodeURI;
  })
  .filter('char',function(){
    return function(input) {
      return String.fromCharCode(0x40 + parseInt(input,10));
    };
  }).filter('noProtocol',function(){
    return function(input) {
      if (typeof input === "string")
        return input.replace(/^https?:/, '');
      return input;
    };
  });

vpApp.controller('MainController', function($scope, $http, $q, $window) {
  
  $scope.goBack = function() {
    $window.history.back();
  };
  
  $scope.dbPromise = $http.get(dbUrl).then(function(res) {
    //create table
    var cells = res.data.feed.entry;
    var table = [];
    var tableInput = [];
    var r, c;

    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      r = cell.gs$cell.row - 1;
      c = cell.gs$cell.col - 1;

      if (!table[r]) {
        table[r] = [];
        tableInput[r] = [];
      }

      table[r][c] = cell.content.$t;
      tableInput[r][c] = cell.gs$cell.inputValue;
    }

    //normalize
    var db = [];
    var head = table[0];
    var guides = [];
    
    //guide scope
    var start = head.indexOf('UID');
    var end = head.indexOf('Art');
    
    $scope.guideFields = head.slice(start, end); // 0 is all albums
    $scope.guideUrls = tableInput[0].slice(start, end).map(function(a) {
      return a.split('"')[1];
    });
    
    //unlabeled fields
    var sortFields = head.slice(end);
    var unlabeledFields = ['Date', 'Genre', 'Subgenre'];
    for (var i = 0; i < unlabeledFields.length; i++) {
      var j = sortFields.indexOf(unlabeledFields[i]);
      if (j >= 0)
        sortFields.splice(j + 1, 0, unlabeledFields[i] + unlabeledSuffix);
    }
    $scope.sortFields = sortFields;
    
    //db scope
    for (r = 1; r < table.length; r++) {
      if (!table[r])
        continue;
      
      var dbRow = {};
      
      for (c = 0; c < head.length - 1; c++) {
        
        if (!tableInput[r][c])
          continue;
        
        if ('Art' === head[c]) {
          var arr = tableInput[r][c].split('"');
          dbRow[head[c]] = arr[1];
          dbRow.Thumbnail = arr[3] || arr[1];
        }
        else {
          dbRow[head[c]] = table[r][c];
        }
      }
      dbRow[head[head.length - 1]] = table[r].slice(c);

      db.push(dbRow);
    }
    
    $scope.db = db;
  });
  
  $scope.dbGuideTextPromise = $http.get(dbGuideText).then(function(res) {
    
    //get guide text labels
    var cells = res.data.feed.entry;
    var table = [];
    var r, c;

    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      r = cell.gs$cell.row - 1;
      c = cell.gs$cell.col - 1;

      if (!table[r])
        table[r] = [];

      table[r][c] = cell.content.$t;
    }
    
    //normalize
    var db = [];
    var head = table[0];
    var guides = [];
    
    //db
    for (r = 1; r < table.length; r++) {
      if (!table[r])
        continue;
      
      var dbRow = {};
      
      for (c = 0; c < head.length - 1; c++) {
        
        if (!table[r][c])
          continue;
        
        dbRow[head[c]] = table[r][c];
      }
      dbRow[head[head.length - 1]] = table[r].slice(c);

      db.push(dbRow);
    }
    
    $scope.dbGuideText = db;
    
  });
});

vpApp.controller('ListController', function($scope, $routeParams, $rootScope, $cacheFactory) {
  
  $rootScope.title = '';
  
  //caching
  var cache = $cacheFactory.get(cacheId) || $cacheFactory(cacheId);
  $scope.$on('$locationChangeStart', function(event) {
    console.log('caching query parameters');
    cache.put('query', $scope.query);
    cache.put('sortField', $scope.sortField);
    cache.put('sortReverse', $scope.sortReverse);
  });
  $scope.query = $routeParams.q || cache.get('query') || '';
  $scope.sortField = cache.get('sortField') || 'Date';
  var sortReverse = cache.get('sortReverse');
  $scope.sortReverse = sortReverse === undefined ? true : sortReverse;
  
  
  $scope.sorter = function(val) {
    var field = $scope.sortField.replace(unlabeledSuffix, '');
    return val[field];
  };
  
  $scope.hasSortField = function(val) {
    var field = $scope.sortField.replace(unlabeledSuffix, '');
    return !!val[field];
  };
});

vpApp.controller('DetailController', function($scope, $filter, $routeParams, $rootScope) {
  
  $scope.$parent.dbPromise.then(function() {
    var albums = $filter('filter')($scope.$parent.db, { UID: $routeParams.uid});
    if (!albums.length)
      return console.log('none found'); //do something
    
    $scope.album = albums[0];
    $rootScope.title = albums[0].Pseudonym + ' - ' + albums[0].Title;
  });
});

vpApp.controller('GuideController', function($scope, $filter, $routeParams, $http, $q, $rootScope, $location, $cacheFactory) {
  
  $rootScope.title = 'guides';
  
  $scope.guideChanged = function(guide, guideFields) {
    var i = guideFields.indexOf(guide);
    if (i >= 0)
      $location.path('/g/' + i);
    else
      console.log('unknown guide changed', guide);
  };
  
  //caching
  var cache = $cacheFactory.get(cacheId) || $cacheFactory(cacheId);
  $scope.$on('$locationChangeStart', function(event) {
    cache.put('labeled', $scope.labeled);
  });
  var labeled = cache.get('labeled');
  $scope.labeled = labeled === undefined ? false : labeled;
  
  $scope.isValidGuide = true;
  
  $scope.$parent.dbPromise.then(function() {
    //set flag if invalid guide
    //note: guideFields[0] is UID, reserved for possible future use
    if (!$routeParams.gid || $routeParams.gid >= $scope.$parent.guideFields.length || $routeParams.gid < 1) {
      $scope.isValidGuide = false;
    }
  });
  
  $q.all([$scope.$parent.dbPromise, $scope.$parent.dbGuideTextPromise]).then(function() {
    if (!$scope.isValidGuide)
      return;
    
    //valid guide
    var guide = $scope.$parent.guideFields[$routeParams.gid];
    $scope.guide = guide;
    $scope.guideUrl = $scope.$parent.guideUrls[$routeParams.gid];

    $rootScope.title = guide;

    var filter = {};
    filter[guide] = '!!';
    var albums = $filter('filter')($scope.$parent.db, filter);
    var texts = $filter('filter')($scope.dbGuideText, filter);
    var albumsAndText = albums.concat(texts);

    // all inclusive
    var maxY = 0;
    var maxX = 0;
    var minY = 0;
    var minX = 0;

    for (var i = 0; i < albumsAndText.length; i++) {

      //note: read values are 1-indexed

      var xy = albumsAndText[i][guide];
      xy = xy.trim().split(/\s+/g);
      xy = xy[xy.length - 1];

      var y = xy.match(/\d+|[@A-Z]+/)[0];
      var x = xy.substr(y.length);

      if (isNaN(y))
        y = y.charCodeAt(0) - 0x40;
      if (isNaN(x))
        x = x.charCodeAt(0) - 0x40;

      y = parseInt(y, 10) - 1;
      x = parseInt(x, 10) - 1;

      if (y > maxY)
        maxY = y;
      else if (y < minY)
        minY = y;

      if (x > maxX)
        maxX = x;
      else if (x < minX)
        minX = x;

      albumsAndText[i]._xy = xy;
      albumsAndText[i]._y = y;
      albumsAndText[i]._x = x;
    }

    //x and y 0-indexed
    $scope.minY = minY;
    $scope.minX = minX;


    $scope.height = maxY - minY + 1;
    $scope.rows = [];
    for (var i = 0; i < $scope.height; i++)
      $scope.rows[i] = minY + i;

    $scope.width = maxX - minX + 1;
    $scope.cols = [];
    for (var i = 0; i < $scope.width; i++)
      $scope.cols[i] = minX + i;

    $scope.albums = [];
    for (var yi = 0; yi < $scope.height; yi++) {
      $scope.albums[yi] = [];
      for (var xi = 0; xi < $scope.width; xi++)
        $scope.albums[yi][xi] = $filter('filter')(albumsAndText, { _y: minY + yi, _x: minX + xi }, true)[0]; // true -> exact match
    }
  });
});

vpApp.config(function($routeProvider) {
  $routeProvider.when('/a/', {
    templateUrl: 'partials/list.html',
    controller: 'ListController'
  }).when('/a/:uid', {
    templateUrl: 'partials/detail.html',
    controller: 'DetailController'
  }).when('/g/:gid?', {
    templateUrl: 'partials/guide.html',
    controller: 'GuideController'
  }).when('/about/', {
    templateUrl: 'partials/about.html'
  }).otherwise({
    redirectTo: '/a/'
  });
});
