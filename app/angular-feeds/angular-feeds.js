/**
 * angular-feeds - v0.0.1
 */
'use strict';


angular.module('feeds-directives', []).directive('feed', ['feedService', '$compile', '$templateCache', '$http', function (feedService, $compile, $templateCache, $http) {
    return {
        restrict: 'E',
        scope: {
            summary: '=summary'
        },
        controller: ['$scope', '$element', '$attrs', '$timeout', function ($scope, $element, $attrs, $timeout) {
            $scope.$watch('finishedLoading', function (value) {
                if ($attrs.postRender && value) {
                    $timeout(function () {
                        new Function("element", $attrs.postRender + '(element);')($element);
                    }, 0);
                }
            });

            $scope.feeds = [];

            var spinner = $templateCache.get('feed-spinner.html');
            $element.append($compile(spinner)($scope));

            function renderTemplate(templateHTML, feedsObj) {
                $element.append($compile(templateHTML)($scope));
                if (feedsObj) {
                    for (var i = 0; i < feedsObj.length; i++) {
                        $scope.feeds.push(feedsObj[i]);
                    }
                }
            }

            feedService.getFeeds($attrs.url, $attrs.count).then(function (feedsObj) {
                if ($attrs.templateUrl) {
                    $http.get($attrs.templateUrl, {cache: $templateCache}).success(function (templateHtml) {
                        renderTemplate(templateHtml, feedsObj);
                    });
                }
                else {
                    renderTemplate($templateCache.get('feed-list.html'), feedsObj);
                }
            }, function (error) {
                console.error('Error loading feed ', error);
                $scope.error = error;
                renderTemplate($templateCache.get('feed-list.html'));
            }).finally(function () {
                $element.find('.spinner').slideUp();
                $scope.$evalAsync('finishedLoading = true')
            });
        }]
    }
}]);

'use strict';

angular.module('feeds', ['feeds-services', 'feeds-directives']);
'use strict';

angular.module('feeds-services', []).factory('feedService', ['$q', '$sce', 'feedCache', function ($q, $sce, feedCache) {

    function sanitizeFeedEntry(feedEntry) {
        feedEntry.title = $sce.trustAsHtml(feedEntry.title);
        feedEntry.contentSnippet = $sce.trustAsHtml(feedEntry.contentSnippet);
        feedEntry.content = $sce.trustAsHtml(feedEntry.content);
        feedEntry.publishedDate = new Date(feedEntry.publishedDate).getTime();

        return feedEntry;
    }

    var getFeeds = function (feedURL, count) {
        var deferred = $q.defer();

        if (feedCache.hasCache(feedURL)) {
            return deferred.resolve(sanitizeFeedEntry(feedCache.get(feedURL)));
        }

        var feed = new google.feeds.Feed(feedURL);
        if (count) {
            feed.includeHistoricalEntries();
            feed.setNumEntries(count);
        }

        feed.load(function (response) {
            if (response.error) {
                deferred.reject(response.error);
            }
            else {
                feedCache.set(response.feed.entries);
                for (var i = 0; i < response.feed.entries.length; i++) {
                    // console.log(response.feed.entries[i].author);
                    sanitizeFeedEntry(response.feed.entries[i]);


                }
                deferred.resolve(response.feed.entries);
            }
        });
        return deferred.promise;
    };

    return {
        getFeeds: getFeeds
    };
}])
    .factory('feedCache', function () {
        var CACHE_INTERVAL = 1000 * 60 * 5; //5 minutes

        function cacheTimes() {
            if ('CACHE_TIMES' in localStorage) {
                return angular.fromJson(localStorage['CACHE_TIMES']);
            }
            return {};
        }

        function hasCache(name) {
            var CACHE_TIMES = cacheTimes();
            return name in CACHE_TIMES && name in localStorage && new Date().getTime() - CACHE_TIMES[name] < CACHE_INTERVAL;
        }

        return {
            set: function (name, obj) {
                localStorage[name] = angular.toJson(obj);
                var CACHE_TIMES = cacheTimes();
                CACHE_TIMES[name] = new Date().getTime();
                localStorage['CACHE_TIMES'] = angular.toJson(CACHE_TIMES);
            },
            get: function (name) {
                if (hasCache(name)) {
                    return angular.fromJson(localStorage[name]);
                }
                return null;
            },
            hasCache: hasCache
        };
    });
angular.module('feeds').directive('shapeDiagramm', ['$timeout', function ($timeout) {
    return {
        link: function (scope, element, attributes) {
            $timeout(function () {
                var text = (angular.element(element).text().toLowerCase() ),
                    result = {
                        labels:[],
                        series:[]
                    };



                (function calcCountMatch(str) {
                    var character = str[0];
                    if(!character)return;
                    var countMatch = str.split(character).length - 1;
                    result.labels.push(  character.toUpperCase());
                    result.series.push(  countMatch);
                     calcCountMatch(str.replace(new RegExp(character , "gi"), ""));
                })((text.replace(/[^a-z]/gi, "")))
                var options = {
                    labelInterpolationFnc: function(value) {
                        return value[0]
                    }
                };
                var responsiveOptions = [
                    ['screen and (min-width: 640px)', {
                        chartPadding: 30,
                        labelOffset: 100,
                        labelDirection: 'explode',
                        labelInterpolationFnc: function(value) {
                            return value;
                        }
                    }],
                    ['screen and (min-width: 1024px)', {
                        labelOffset: 80,
                        chartPadding: 50
                        ,labelDirection: 'explode',
                    }]
                ];

                new Chartist.Pie(angular.element(element).parent().find('.ct-chart')[0], result, options);

            });



        }
    }
}]).run(['$templateCache', function ($templateCache) {
    'use strict';

    $templateCache.put('feed-list.html',
        "<div>\n" +
        "    <div ng-show=\"error\" class=\"alert alert-danger\">\n" +
        "        <h5 class=\"text-center\">There was an error retrieving feeds. Please try again later.</h5>\n" +
        "    </div>\n" +
        "\n" +
        "    <ul class=\"media-list\">\n" +
        "        <li ng-repeat=\"feed in feeds | orderBy:publishedDate:reverse\" class=\"media\">\n" +
        "            <div class=\"media-body\">\n" +
        "                <h4 class=\"media-heading\"><a target=\"_new\" href=\"{{feed.link}}\" ng-bind-html=\"feed.title\"></a></h4>\n" +
        "                <p shape-diagramm ng-bind-html=\"!summary ? feed.content : feed.contentSnippet\"></p>\n" +
        "                <div     class=\"ct-chart ct-perfect-fourth\"></div>\n" +
        "            </div>\n" +
        "            <hr ng-if=\"!$last\"/>\n" +
        "        </li>\n" +
        "    </ul>\n" +
        "</div>"
    );


  

}]);
