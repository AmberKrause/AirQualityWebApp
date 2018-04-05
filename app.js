"use strict";

(function() {
  var app = angular.module("app", []);

  // JSON object with Air Quality Data;
  // initialized in the TableController function.

  app.controller("MapController", function($rootScope, $scope) {
    var map; //Map object
    var heatmap; // Heatmap object
    var heatmapData;    // data for Heatmap object
    var gradient;   // colors for Heatmap object
    var input; //input text box
    var searchBox; //SearchBox object
    var geocoder; //geocoder to get loc desc from coords
    var markerCluster; //controls markers and clustering


    //MAP INITIALIZATION START

    //initialize the map
    $rootScope.curLoc = new google.maps.LatLng(43, -120);
    // Adding a specific latLng object, because curLoc gets overwritten with the
    // address (which is definitely nicer to show in the searchBox):
    $rootScope.latLng = $rootScope.curLoc;
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 4,
      center: $rootScope.curLoc
    });

    // This ensures that the map will be fully loaded before we try to initialize map.bounds:
    google.maps.event.addListener(map, "tilesloaded", () => {
        $rootScope.bounds = map.getBounds();

        // Tells the TableController to update the data:
        $rootScope.$broadcast("map-ready");
    });

    //MAP INITIALIZATION END

    // For heatmap:
    heatmapData  = [];


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

      $rootScope.bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        if(!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }
        if(place.geometry.viewport) {
          $rootScope.bounds.union(place.geometry.viewport);
        } else {
          $rootScope.bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds($rootScope.bounds);
    });//places_changed listener

    //geocoder for location lookup
    geocoder = new google.maps.Geocoder;

    //update text when map is moved or zoom changed
    map.addListener("dragend", updateSearchText);
    map.addListener("zoom_changed", updateSearchText);

    //update search text
    function updateSearchText() {
      $rootScope.latLng = map.getCenter();
      var coords = $rootScope.latLng.toJSON();

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

              $rootScope.curLoc = results[i].formatted_address;
          }
          else {
            $rootScope.curLoc = $rootScope.latLng;
          }

          // Tells the TableController to update the data:
          $rootScope.$broadcast("map-ready");

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
      var markers = $rootScope.measurements.map(function(measure, i) {
        var lat = $rootScope.measurements[i].coordinates.latitude;
        //console.log("TESTING: Latitude for marker:" + lat);
        var lon = $rootScope.measurements[i].coordinates.longitude;
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
      updateHeatmap();
    });

    //MARKERS END


    // HEATMAP START

    function updateHeatmap() {
        angular.forEach($rootScope.measurements, function(value, key) {
            heatmapData[key] = new google.maps.LatLng(value.coordinates.latitude, value.coordinates.longitude);
        });

        heatmap  = new google.maps.visualization.HeatmapLayer({
            data: heatmapData
        });
        heatmap.setMap(map);
    } // updateHeatmap

    // HEATMAP END

}); // MapController


// https://api.openaq.org/v1/measurements?coordinates=18.65,76.90&radius=500000
app.controller("TableController", function($rootScope, $scope, $http) {

    $scope.$on("map-ready", function(event) {
            // The latitude span changes depending on distance from the equator,
            // but longitude will be steady.
            // 1 degree longitude = 111 km

        $http.get("https://api.openaq.org/v1/measurements?coordinates=" + $rootScope.latLng.toUrlValue() + "&radius=" + (($rootScope.bounds.toSpan().lng() / 2) * 111000))
        .then(function (response) {
            $rootScope.measurements   = response.data.results;

            //notify MapController to update markers and heatmap
            $rootScope.$broadcast("data-ready");

        }, function (response) {
            console.log("Caught an http error; response = " + response);
        });
    }); // map-ready

}); // TableController

app.controller("FilterController", function($scope, $http) {
    $scope.$on("map-ready", function(event) {
        $http.get("https://api.openaq.org/v1/parameters")
        .then(function (response) {
            $scope.parameters   = response.data.results;
/*
            $rootScope.$broadcast("data-ready");
*/
        }, function (response) {
            console.log("Caught an http error; response = " + response);
        });
    }); // map-ready
}); // FilterController

})();
