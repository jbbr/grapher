import createGraph from './lib/createGraph.js';
import recursiveFetch from './lib/recursiveFetch.js';
import prepareForProcess from './lib/prepareForProcess.js';
import deepClone from './lib/deepClone.js';
import Base from './query.base';

export default class Query extends Base {
    /**
     * Subscribe
     *
     * @param callback {Function} optional
     * @returns {null|any|*}
     */
    subscribe(callback) {
        this.subscriptionHandle = Meteor.subscribe(
            this.name,
            prepareForProcess(this.body, this.params),
            callback
        );

        return this.subscriptionHandle;
    }

    /**
     * Unsubscribe if an existing subscription exists
     */
    unsubscribe() {
        if (this.subscriptionHandle) {
            this.subscriptionHandle.stop();
        }

        this.subscriptionHandle = null;
    }

    /**
     * Retrieves the data.
     * @param callbackOrOptions
     * @returns {*}
     */
    fetch(callbackOrOptions) {
        if (!this.subscriptionHandle) {
            return this._fetchStatic(callbackOrOptions)
        } else {
            return this._fetchReactive(callbackOrOptions);
        }
    }

    /**
     * Gets the count of matching elements.
     * @param callback
     * @returns {any}
     */
    getCount(callback) {
      return new Promise((resolve, reject) => {
        Meteor.call(this.name + '.count', prepareForProcess(this.body, this.params), (error, result) => {
          if (callback) {
            callback(error, result);
          }
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        });
      });
    }

    /**
     * Fetching non-reactive queries
     * @param callback
     * @private
     */
    _fetchStatic(callback) {
        return new Promise((resolve, reject) => {
            Meteor.call(this.name, prepareForProcess(this.body, this.params), (error, result) => {
                if (callback) {
                  callback(error, result);
                }
                if (error) {
                  reject(error);
                  return;
                }
                resolve(result);
            });
        });
    }

    /**
     * Fetching when we've got an active publication
     *
     * @param options
     * @returns {*}
     * @private
     */
    _fetchReactive(options = {}) {
        let body = prepareForProcess(this.body, this.params);
        if (!options.allowSkip && body.$options && body.$options.skip) {
            delete body.$options.skip;
        }

        return recursiveFetch(
            createGraph(this.collection, body)
        );
    }
}
