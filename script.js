var dbUrl = "https://spreadsheets.google.com/feeds/cells/1lQQpRjLBF_9rtDXgvON7-V-ow0szcd5OyVoRUJpPOS0/1/public/full?alt=json";

var vpApp = angular.module('vpApp', ['ngRoute']);

vpApp.controller('MainController', function($scope, $http, $q) {
  
  $scope.dbPromise = $http.get(dbUrl).then(function(res) {
    //create table
    var cells = res.data.feed.entry;
    var table = [];
    var tableInput = [];

    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var r = cell.gs$cell.row - 1;
      var c = cell.gs$cell.col - 1;

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

    for (var r = 1; r < table.length; r++) {
      if (!table[r])
        continue;
      var dbRow = {};
      for (var c = 0; c < head.length - 1; c++) {
        if (!tableInput[r][c])
          continue;
        var val;
        if ('Art'.indexOf(head[c]) === 0)
          dbRow[head[c]] = tableInput[r][c].split('"')[1];
        else
          dbRow[head[c]] = table[r][c];
      }
      dbRow[head[head.length - 1]] = table[r].slice(c);

      db.push(dbRow);
    }

    $scope.sortFields = head;
    $scope.db = db;
  });
});

vpApp.controller('ListController', function($scope) {
  $scope.sortField = 'Art';
  
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

vpApp.config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'partials/home.html',
    controller: 'ListController'
  }).
  when('/:uid', {
    templateUrl: 'partials/detail.html',
    controller: 'DetailController'
  }).
  otherwise({
    redirectTo: '/'
  });
});
