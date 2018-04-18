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
import angular = require('angular');

import NotificationService from '../services/notification.service';

function interceptorConfig(
  $httpProvider: angular.IHttpProvider
) {
  'ngInject';
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  $httpProvider.defaults.withCredentials = true;

  const interceptorUnauthorized = ($q: angular.IQService, $injector: angular.auto.IInjectorService): angular.IHttpInterceptor => ({
    responseError: function (error) {
      if (error.config && !error.config.tryItMode) {
        var unauthorizedError = !error || error.status === 401;
        var errorMessage = '';

        var notificationService = ($injector.get('NotificationService') as NotificationService);
        if (unauthorizedError) {
          notificationService.showError(error, 'Session expired, redirecting to home...');
          $injector.get('$timeout')(function () {
            $injector.get('$rootScope').$broadcast('graviteeLogout');
          }, 2000);
        } else {
          if (error.status === 500) {
            errorMessage = error.data ? error.data.message : 'Unexpected error';
          } else if (error.status === 503) {
            errorMessage = error.data ? error.data.message : 'Server unavailable';
          }
          if (error && error.status > 0 && !error.config.silentCall) {
            notificationService.showError(error, errorMessage);
          }
        }
      }

      return $q.reject(error);
    }
  });

  const interceptorTimeout = function ($q: angular.IQService, $injector: angular.auto.IInjectorService): angular.IHttpInterceptor {
    return {
      request: function (config) {
        // Use defined HTTP timeout or default value
        config.timeout = config.timeout || 10000;
        return config;
      },
      responseError: function (error) {
        const notificationService = ($injector.get('NotificationService') as NotificationService);
        if(error.config && !error.config.tryItMode) {
          if (error && error.status <= 0) {
            notificationService.showError('Server unreachable');
          }
        } else {
          notificationService.showError('Unable to call the remote service.');
        }
        return $q.reject(error);
      }
    };
  };

  const interceptorAuthorization = function ($cookies): angular.IHttpInterceptor {
    return {
      request: function (config) {
        if ($cookies.get('Authorization')) {
          config.headers.Authorization = $cookies.get('Authorization');
        }
        return config;
      }
    };
  };


  if ($httpProvider.interceptors) {
    $httpProvider.interceptors.push(interceptorAuthorization);
    $httpProvider.interceptors.push(interceptorUnauthorized);
    $httpProvider.interceptors.push(interceptorTimeout);
  }
}

export default interceptorConfig;
