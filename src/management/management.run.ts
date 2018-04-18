/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global setInterval:false, clearInterval:false, screen:false */
import UserService from '../services/user.service';
import _ = require('lodash');

function runBlock($rootScope, $state, $http, $mdSidenav, $transitions, $window,
                  $timeout, UserService: UserService, Constants, PermissionStrategies) {
  'ngInject';

  $transitions.onStart({ to: (state) => state.name !== 'login' && state.name !== 'registration'}, function(trans) {
    let forceLogin = (Constants.authentication && Constants.authentication.forceLogin) || false;

    if (forceLogin && !UserService.isAuthenticated()) {
      return trans.router.stateService.target('login');
    }
  });

  $transitions.onFinish({}, function (trans) {
    let fromState = trans.from();
    let toState = trans.to();

    let notEligibleForDevMode = Constants.devMode && toState.data && !toState.data.devMode;
    let notEligibleForUserCreation = !Constants.userCreationEnabled && (fromState.name === 'registration' || fromState === 'confirm');

    if (notEligibleForDevMode || notEligibleForUserCreation) {
      return trans.router.stateService.target('login');
    } else if (toState.data && toState.data.perms && toState.data.perms.only && !UserService.isUserHasPermissions(toState.data.perms.only)) {
      return trans.router.stateService.target(UserService.isAuthenticated() ? 'management.apis.list' : 'login');
    }
  });

  $rootScope.$on('graviteeLogout', function () {
    UserService.logout().then(
      () => {
        $state.go('portal.home');
        $rootScope.$broadcast('graviteeUserRefresh');
        $rootScope.$broadcast('graviteeUserCancelScheduledServices');
        if ((Constants.authentication && Constants.authentication.oauth2.userLogoutEndpoint) || false) {
          var redirectUri = encodeURIComponent(window.location.origin + (window.location.pathname == '/' ? '' : window.location.pathname));
          $window.location.href= Constants.authentication.oauth2.userLogoutEndpoint + "?redirect_uri=" + redirectUri;
        }
      }
    );
  });

  $rootScope.$watch(function () {
    return $http.pendingRequests.length > 0;
  }, function (hasPendingRequests) {
    $rootScope.isLoading = hasPendingRequests;
  });

  $rootScope.displayLoader = true;

  // force displayLoader value to change on a new digest cycle
  $timeout(function () {
    $rootScope.displayLoader = false;
  });

  $rootScope.PermissionStrategies = PermissionStrategies;
}

export default runBlock;
