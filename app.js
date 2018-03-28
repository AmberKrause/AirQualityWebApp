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
    var geocoder; //geocoder to get loc desc from coords
    var markerCluster; //controls markers and clustering


    //MAP INITIALIZATION START

    //initialize the map
    $scope.curLoc = new google.maps.LatLng(45, -100);
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 4,
      center: $scope.curLoc
    });

    //MAP INITIALIZATION END




    //SEARCHBOX START

    input = document.getElementById("loc-input");

    //add map control SearchBox
    searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

    //bias SearchBox results towards current viewport
    map.addListener("bounds_changed", function() {
      searchBox.setBounds(map.getBounds());
    });

    //listen for user to search with SearchBox
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
    });//places_changed listener

    //geocoder for location lookup
    geocoder = new google.maps.Geocoder;

    //update text when map is moved or zoom changed
    map.addListener("dragend", updateSearchText);
    map.addListener("zoom_changed", updateSearchText);

    //update search text
    function updateSearchText() {
      var coords = map.getCenter().toJSON();

      geocoder.geocode({'location': coords}, function(results, status) {
          if(status === 'OK') {
              if(map.zoom <= 5) {
                //get country
                for(var i = 0; results[i]; i++) {
                  if(results[i].types.includes("country")) {
                    break;
                  }
                }
              } //if(map.zoom <= 5)
              else if(map.zoom <= 12) {
                //get city or township
                for(var i = 0; results[i]; i++) {
                  if(results[i].types.includes("political")) {
                    break;
                  }
                }
              } //else if(map.zoom <= 12)
              else {
                //get most specific address
                i = 0;
              } //else

              $scope.curLoc = results[i].formatted_address;
          }
          else {
            $scope.curLoc = map.getCenter();
          }
          $scope.$apply();
      });//geocode
    };//updateSearchText

    //SEARCHBOX END




    //MARKERS START

    function updateMarkers() {
      //create some labels
      var labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      //clear current markers
      if(markerCluster != undefined) {
        markerCluster.clearMarkers();
      }

      //create array of markers
      var markers = aqData.map(function(measure, i) {
        var lat = aqData[i].coordinates.latitude;
        console.log("TESTING: Latitude for marker:" + lat);
        var lon = aqData[i].coordinates.longitude;
        return new google.maps.Marker({
          position: new google.maps.LatLng(lat,lon),
          label: labels[i % labels.length]
        });
      });

      //add marker clusterer to manage the markers
      markerCluster = new MarkerClusterer(map, markers, {imagePath: "images/m"});

    } //updateMarkers

    $scope.$on("data-ready", function(event) {
      //console.log("TESTING: inside receiver");
      updateMarkers();
    });

    //MARKERS END

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

        //notify MapController to update markers
        $scope.$parent.$broadcast("data-ready");
    });

    //console.log("$scope.measurements = " + $scope.measurements)
}); // TableController

/*
function mapMoved() {
    console.log("Map moved!");
}
*/
})();
