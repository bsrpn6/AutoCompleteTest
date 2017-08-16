'use strict';

/**
 * A directive for adding google places autocomplete to a text box
 * google places autocomplete info: https://developers.google.com/maps/documentation/javascript/places
 *
 * Usage:
 *
 * + ng-model - autocomplete textbox value
 *
 * + details - more detailed autocomplete result, includes address parts, latlng, etc. (Optional)
 *
 * + options - configuration for the autocomplete (Optional)
 *
 *       + types: type,        String, values can be 'geocode', 'establishment', '(regions)', or '(cities)'
 *       + bounds: bounds,     Google maps LatLngBounds Object, biases results to bounds, but may return results outside these bounds
 *       + country: country    String, ISO 3166-1 Alpha-2 compatible country code. examples; 'ca', 'us', 'gb'
 *       + watchEnter:         Boolean, true; on Enter select top autocomplete result. false(default); enter ends autocomplete
 *
 * example:
 *
 *    options = {
 *        types: '(cities)',
 *        country: 'ca'
 *    }
**/

angular.module("ngAutocomplete", [])

  .controller("TestCtrl", function ($scope) {
  })

    .controller('MapCtrl', function ($scope, $window) {

        var markers = [];

        $scope.map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: 38.630499,
                lng: -90.192248
            },
            zoom: 3 
        });

        $scope.$watch(function () {
            return $scope.details;
        }, function (newValue, oldValue) {
            if (newValue != null) {
                
                deleteMarkers();
                var myLatLng = { lat: $scope.details.geometry.location.lat(), lng: $scope.details.geometry.location.lng() };

                var marker = new google.maps.Marker({
                    position: myLatLng,
                    map: $scope.map,
                    animation: google.maps.Animation.DROP,
                    title: 'Hello World!',
                });
                
                markers.push(marker);
                $scope.map.setCenter(myLatLng);
                $scope.map.setZoom(16);
            };
        });

        // Deletes all markers in the array by removing references to them.
        function deleteMarkers() {
            for (var i = 0; i < markers.length; i++) {
                markers[i].setMap(null);
            }
            markers = [];
        }

    })

  .directive('ngAutocomplete', function () {
      return {
          require: 'ngModel',
          scope: {
              ngModel: '=',
              options: '=?',
              details: '=?'
          },

          link: function (scope, element, attrs, controller) {

              //options for autocomplete
              var opts
              var watchEnter = false
              //convert options provided to opts
              var initOpts = function () {

                  opts = {}
                  if (scope.options) {

                      if (scope.options.watchEnter !== true) {
                          watchEnter = false
                      } else {
                          watchEnter = true
                      }

                      if (scope.options.types) {
                          opts.types = []
                          opts.types.push(scope.options.types)
                          scope.gPlace.setTypes(opts.types)
                      } else {
                          scope.gPlace.setTypes([])
                      }

                      if (scope.options.bounds) {
                          opts.bounds = scope.options.bounds
                          scope.gPlace.setBounds(opts.bounds)
                      } else {
                          scope.gPlace.setBounds(null)
                      }

                      if (scope.options.country) {
                          opts.componentRestrictions = {
                              country: scope.options.country
                          }
                          scope.gPlace.setComponentRestrictions(opts.componentRestrictions)
                      } else {
                          scope.gPlace.setComponentRestrictions(null)
                      }
                  }
              }

              if (scope.gPlace == undefined) {
                  scope.gPlace = new google.maps.places.Autocomplete(element[0], {});
              }
              google.maps.event.addListener(scope.gPlace, 'place_changed', function () {
                  var result = scope.gPlace.getPlace();
                  if (result !== undefined) {
                      if (result.address_components !== undefined) {

                          scope.$apply(function () {

                              scope.details = result;

                              controller.$setViewValue(element.val());
                          });
                      }
                      else {
                          if (watchEnter) {
                              getPlace(result)
                          }
                      }
                  }
              })

              //function to get retrieve the autocompletes first result using the AutocompleteService 
              var getPlace = function (result) {
                  var autocompleteService = new google.maps.places.AutocompleteService();
                  if (result.name.length > 0) {
                      autocompleteService.getPlacePredictions(
                        {
                            input: result.name,
                            offset: result.name.length
                        },
                        function listentoresult(list, status) {
                            if (list == null || list.length == 0) {

                                scope.$apply(function () {
                                    scope.details = null;
                                });

                            } else {
                                var placesService = new google.maps.places.PlacesService(element[0]);
                                placesService.getDetails(
                                  { 'reference': list[0].reference },
                                  function detailsresult(detailsResult, placesServiceStatus) {

                                      if (placesServiceStatus == google.maps.GeocoderStatus.OK) {
                                          scope.$apply(function () {

                                              controller.$setViewValue(detailsResult.formatted_address);
                                              element.val(detailsResult.formatted_address);

                                              controller.$setViewValue(detailsResult.opening_hours);
                                              element.val(detailsResult.opening_hours);

                                              controller.$setViewValue(detailsResult.rating);
                                              element.val(detailsResult.rating);

                                              controller.$setViewValue(detailsResult.photos);
                                              element.val(detailsResult.photos);

                                              controller.$setViewValue(detailsResult.geometry.location);
                                              element.val(detailsResult.geometry.location);

                                              scope.details = detailsResult;

                                              var marker = new google.maps.Marker({
                                                  map: map,
                                                  place: {
                                                      placeId: detailsResult.placeId,
                                                      location: detailsResult.geometry.location
                                                  }
                                              })

                                              //on focusout the value reverts, need to set it again.
                                              var watchFocusOut = element.on('focusout', function (event) {
                                                  element.val(detailsResult.formatted_address);
                                                  element.val(detailsResult.opening_hours);
                                                  element.val(detailsResult.rating);
                                                  element.val(detailsResult.photos);
                                                  element.val(detailsResult.geometry.location);
                                                  element.unbind('focusout')
                                              })
                                          });
                                      }
                                  }
                                );
                            }
                        });
                  }
              }

              controller.$render = function () {
                  var location = controller.$viewValue;
                  element.val(location);
              };

              //watch options provided to directive
              scope.watchOptions = function () {
                  return scope.options
              };
              scope.$watch(scope.watchOptions, function () {
                  initOpts()
              }, true);

          }
      };
  });
