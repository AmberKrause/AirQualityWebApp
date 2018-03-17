"use strict";

(function() {
  var app = angular.module("app", []);

  app.controller("MapController", function($scope) {
    var mapCont = $scope;

    mapCont.latlng = new google.maps.LatLng(45, -93);
    var map = new google.maps.Map(document.getElementById("map"), {
      zoom: 4,
      center: mapCont.latlng
    });


    map.addListener("center_changed", ()=> {
      console.log("center changed");
    });

  });

})();
