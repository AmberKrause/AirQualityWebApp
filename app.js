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
    $rootScope.curLoc = new google.maps.LatLng(43, -100);
    // Adding a specific latLng object, because curLoc gets overwritten with the
    // address (which is definitely nicer to show in the searchBox):
    $rootScope.latLng = $rootScope.curLoc;
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 6,
      center: $rootScope.curLoc
    });

    // This ensures that the map will be fully loaded before we try to initialize map.bounds:
    google.maps.event.addListener(map, "tilesloaded", () => {
        $rootScope.bounds = map.getBounds();

        // Tells the TableController to update the data:
        $rootScope.$broadcast("map-ready");
        console.log("Just broadcasted that the map is ready.");
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
    //      $rootScope.$broadcast("map-ready");

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
/*old way that works for clustering but no info box
      var markers = aqData.map(function(measure, i) {
        var lat = aqData[i].coordinates.latitude;
        var lon = aqData[i].coordinates.longitude;
        return new google.maps.Marker({
          position: new google.maps.LatLng(lat,lon),
          label: labels[i % labels.length]
        });
      });
*/

/*new way including info box*/
var infowindow = new google.maps.InfoWindow();
      var markers = $rootScope.measurements.map(function(measure, i) {
        var lat = $rootScope.measurements[i].coordinates.latitude;
        var lon = $rootScope.measurements[i].coordinates.longitude;
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(lat,lon),
          label: labels[i % labels.length]
        });
        marker.addListener('mouseover', function() {
          infowindow.setContent($rootScope.measurements[i].parameter + ": " + $rootScope.measurements[i].value + $rootScope.measurements[i].unit);
          infowindow.open(map, marker);
          //console.log("opened info box");
        });
        marker.addListener('mouseout', function() {
          infowindow.close();
          //console.log("closed info box");
        });
        return marker;
      });
/*new way including info box*/




      //add marker clusterer to manage the markers
      markerCluster = new MarkerClusterer(map, markers, {imagePath: "images/m"});
    } //updateMarkers

    // map-ready => parameters-ready => data-ready:
    $scope.$on("data-ready", function(event) {
      updateMarkers();
//      if($rootScope.curParameters.length == 1) {
          updateHeatmap();
//      }
    });

    //MARKERS END


    // HEATMAP START

    function updateHeatmap() {
        var gradient = [
          "rgb(255, 155, 47)",
          "rgb(247, 143, 55)",
          "rgb(238, 130, 63)",
          "rgb(230, 118, 72)",
          "rgb(221, 105, 80)",
          "rgb(213, 93, 88)",
          "rgb(205, 81, 96)",
          "rgb(196, 68, 105)",
          "rgb(188, 56, 113)",
          "rgb(179, 43, 121)",
          "rgb(171, 31, 129)",
          "rgb(150, 0, 150)"
      ];

        angular.forEach($rootScope.measurements, function(value, key) {
            heatmapData[key] = new google.maps.LatLng(value.coordinates.latitude, value.coordinates.longitude);
        });

        heatmap  = new google.maps.visualization.HeatmapLayer({
            data: heatmapData
        });
        heatmap.setMap(map);
        heatmap.set('gradient', gradient);

    } // updateHeatmap

    // HEATMAP END

}); // MapController

app.controller("FilterController", function($rootScope, $scope, $http, $document) {
    $rootScope.curParameters    = [];
    $rootScope.sliderVals       = {
        "bc" : 0,
        "co" : 0,
        "no2" : 0,
        "o3" : 0,
        "pm10" : 0,
        "pm25" : 0,
        "so2" : 0
    };
    $scope.maxSliderVals    = {
        "bc" : 100,
        "co" : 1,
        "no2" : 1,
        "o3" : 1,
        "pm10" : 100,
        "pm25" : 100,
        "so2" : 1
    };

    // Just gets the parameters the first time (they are constants):
    if($rootScope.parameters === undefined) {
            $http.get("https://api.openaq.org/v1/parameters")
            .then(function (response) {
                $rootScope.parameters   = response.data.results;

                $rootScope.parameters.forEach(function(param, key) {
                    $rootScope.parameters[key] = param.id;
                    $rootScope.curParameters[key]  = param.id;
                });

                $rootScope.$broadcast("parameters-ready");
            }, function (response) {
                console.log("Caught an http error while trying to load parameters; response = " + response);
            });
//        }); // map-ready
    } // if / listen for tilesloaded

    // Filter Parameters waits for Map, Table waits for Filter Parameters:
    $scope.$on("map-ready", function(event) {
            $scope.updateParameters();
    }); // map-ready

    // updateParameters is its own function (not just in "map-ready")
    // so that it can be called by the Filter button.
    $scope.updateParameters = function() {

        // The first time through, it sometimes tries to do this before window.onload
        // has happened and initialized paramters, so we check to see if this
        // var has been initialized and just skip it if not (it will get called again).
        if($rootScope.parameters != undefined) {
            $rootScope.curParameters   = [];

            $rootScope.parameters.forEach(function(param) {
                if(document.getElementById(param).checked) {
                    $rootScope.curParameters.push(param);
                }
            });

            $rootScope.$broadcast("parameters-ready");
        } // $rootScope.parameters != undefined
    } // clicked
}); // FilterController


// https://api.openaq.org/v1/measurements?coordinates=18.65,76.90&radius=500000
app.controller("TableController", function($rootScope, $scope, $http) {

    // Filter Parameters wait for Map, Table waits for Filter Parameters:
    $scope.$on("parameters-ready", function(event) {
            // The latitude span changes depending on distance from the equator,
            // but longitude will be steady.
            // 1 degree longitude = 111 km

            var parameterString = "parameter=";
            $rootScope.curParameters.forEach(function(param, key){
                    parameterString = parameterString + param + "&parameter=";
            });
            parameterString = parameterString.substring(0, (parameterString.length - 11));

            if($rootScope.bounds != undefined) {
                console.log("https://api.openaq.org/v1/measurements?" + parameterString + "&coordinates=" + $rootScope.latLng.toUrlValue() + "&radius=" + (($rootScope.bounds.toSpan().lng() / 2) * 111000));
                $http.get("https://api.openaq.org/v1/measurements?" + parameterString + "&coordinates=" + $rootScope.latLng.toUrlValue() + "&radius=" + (($rootScope.bounds.toSpan().lng() / 2) * 111000))
                .then(function (response) {
                    $rootScope.measurements   = response.data.results;

                    console.log("    ---- Still checking parameters for slider compare? Checking pm10 against " + $rootScope.sliderVals.pm10);

                    $rootScope.measurements.forEach(function(measurement, key) {
                        ///console.log( key + ": measurement.parameter = " + measurement.parameter + "; measurement.value = " + measurement.value + "; $rootScope.sliderVals[measurement.parameter] = " + $rootScope.sliderVals[measurement.parameter]);
                        if(measurement.value < $rootScope.sliderVals[measurement.parameter]) {
                            //console.log("About to remove " + measurement.parameter + " with measure " + measurement.value);
                            $rootScope.measurements.splice(key, 1);
                        } /*else {
                            console.log("Keeping in " + measurement.parameter + " with measure " + measurement.value);
                        }*/
                    });

                    //notify MapController to update markers and heatmap
                    $rootScope.$broadcast("data-ready");
                }, function (response) {
                    console.log("Caught an http error while filling the table; response = " + response);
                });
            } else {
                console.log("TableController.on parameters-ready: map bounds are undefined; did not load table data.");
            }
    }); // parameters ready

}); // TableController

})();
