var dbUrl = "https://spreadsheets.google.com/feeds/cells/1lQQpRjLBF_9rtDXgvON7-V-ow0szcd5OyVoRUJpPOS0/1/public/full?alt=json";

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
      return $sce.trustAsResourceUrl('http://bandcamp.com/EmbeddedPlayer/album=' + encodeURIComponent(id) + '/size=large/bgcol=333333/linkcol=0f91ff/artwork=none/transparent=true/');
    };
  })
  .filter('soundcloudPlaylistEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/' + encodeURIComponent(id) + '&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_artwork=false');
    };
  })
  .filter('soundcloudTrackEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/' + encodeURIComponent(id) + '&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_artwork=false');
    };
  })
  .filter('youtubeVideoEmbed', function($sce) {
    return function(id) {
      return $sce.trustAsResourceUrl('http://www.youtube.com/embed/' + encodeURIComponent(id));
    };
  })
  .filter('spotifyEmbed', function($sce) {
    return function(url) {
      return $sce.trustAsResourceUrl('https://open.spotify.com/embed?uri=' + encodeURIComponent(url));
    }
  })
  .filter('trustAsResourceUrl', function($sce) {
    return $sce.trustAsResourceUrl;
  })
  .filter('decodeURI', function() {
    return window.decodeURI;
  })
  .filter('char',function(){
    return function(input){
      return String.fromCharCode(0x40 + parseInt(input,10));
    };
  });

vpApp.controller('MainController', function($scope, $http, $q) {
  
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
    $scope.sortFields = head.slice(end);
    
    //db scope

    for (r = 1; r < table.length; r++) {
      if (!table[r])
        continue;
      
      var dbRow = {};
      
      for (c = 0; c < head.length - 1; c++) {
        
        if (!tableInput[r][c])
          continue;
        
        var val;
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
});

vpApp.controller('ListController', function($scope, $routeParams) {
  
  $scope.query = $routeParams.q;
  $scope.sortField = 'Date';
  $scope.sortReverse = true;
  
  $scope.sorter = function(val) {
    return val[$scope.sortField];
  };
  
  $scope.hasSortField = function(val) {
    return !!val[$scope.sortField];
  };
});

vpApp.controller('DetailController', function($scope, $filter, $routeParams) {
  $scope.$parent.dbPromise.then(function() {
    var albums = $filter('filter')($scope.$parent.db, { UID: $routeParams.uid});
    if (!albums)
      return console.log('none found'); //do something
    $scope.album = albums[0];
  });
});

vpApp.controller('GuideController', function($scope, $filter, $routeParams) {
  $scope.$parent.dbPromise.then(function() {
    var guide = $scope.$parent.guideFields[$routeParams.gid];
    $scope.guide = guide;
    $scope.guideUrl = $scope.$parent.guideUrls[$routeParams.gid];
    
    var filter = {};
    filter[guide] = '!!';
    var albums = $filter('filter')($scope.$parent.db, filter);
    
    var height = 0;
    var width = 0;
    for (var i = 0; i < albums.length; i++) {
      
      //note: x and y are 1-indexed
      
      var xy = albums[i][guide];
      xy = xy.trim().split(/\s+/g);
      xy = xy[xy.length - 1];
      
      var y = xy.match(/\d+|[A-Z]+/)[0];
      var x = xy.substr(y.length);
      
      if (isNaN(y))
        y = y.charCodeAt(0) - 0x40;
      if (isNaN(x))
        x = x.charCodeAt(0) - 0x40;
      
      y = parseInt(y, 10);
      x = parseInt(x, 10);
      
      if (y > height)
        height = y;
      if (x > width)
        width = x;
      
      albums[i].y = y - 1;
      albums[i].x = x - 1;
    }
    
    //x and y 0-indexed
    
    $scope.height = height;
    $scope.rows = [];
    for (var i = 0; i < height; i++)
      $scope.rows[i] = i;
    
    $scope.width = width;
    $scope.cols = [];
    for (var i = 0; i < width; i++)
      $scope.cols[i] = i;
    
    $scope.albums = [];
    for (var yi = 0; yi < height; yi++) {
      $scope.albums[yi] = [];
      for (var xi = 0; xi < width; xi++)
        $scope.albums[yi][xi] = $filter('filter')(albums, { y: yi, x: xi }, true)[0]; // true -> exact match
    }
  });
});

vpApp.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'partials/list.html',
    controller: 'ListController'
  }).when('/q/:q', {
    templateUrl: 'partials/list.html',
    controller: 'ListController'
  }).when('/a/:uid', {
    templateUrl: 'partials/detail.html',
    controller: 'DetailController'
  }).when('/g/:gid', {
    templateUrl: 'partials/guide.html',
    controller: 'GuideController'
  }).otherwise({
    redirectTo: '/'
  });
});
