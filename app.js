"use strict";

(function() {
  var app = angular.module("app", []);

  // JSON object with Air Quality Data;
  // initialized in the TableController function.
  var aqData;

  app.controller("MapController", function($scope) {
    var map; //Map object
    var input; //input text box
    var searchBox; //SearchBox object

    //initialize the map
    $scope.latlng = new google.maps.LatLng(45, -100);
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 4,
      center: $scope.latlng
    });
    input = document.getElementById("loc-input");
    //input.value = "(45, -93)";

    //add map control SearchBox
    searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

    //bias SearchBox results towards current viewport
    map.addListener("bounds_changed", function() {
      searchBox.setBounds(map.getBounds());
    });

    //listen for user to search
    searchBox.addListener("places_changed", function() {
      var places = searchBox.getPlaces();

      if(places.length == 0) {
        return;
      }

      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        if(!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }
        if(place.geometry.viewport) {
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
    });
/*
    map.addListener("drag", ()=> {
      console.log("center changed: " + map.getCenter());
      $scope.latlng = map.getCenter();
      //update search box input value
      //how to do with data binding???
    });
    */
}); // MapController

// https://api.openaq.org/v1/measurements?coordinates=18.65,76.90&radius=500000
app.controller("TableController", function($scope, $http) {

    // Real URL:
    // https://api.openaq.org/v1/measurements?coordinates=18.65,76.90&radius=50000

    // But for now, that data is at
    // https://emilymeuer.github.io/AirQualityWebApp/measurements.json
    // to avoid this error:
    // "The 'Access-Control-Allow-Origin' header has a value 'null' that is not
    // equal to the supplied origin. Origin 'null' is therefore not allowed access."
    $http.get("https://emilymeuer.github.io/AirQualityWebApp/measurements.json?coordinates=18.65,76.90&radius=500000")
    .then(function (response) {
        aqData              = response.data.results;
        $scope.measurements = aqData;
    });

    //console.log("$scope.measurements = " + $scope.measurements)
}); // TableController

/*
function mapMoved() {
    console.log("Map moved!");
}
*/
})();
