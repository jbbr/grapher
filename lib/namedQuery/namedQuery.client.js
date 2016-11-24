import createGraph from '../query/lib/createGraph.js';
import recursiveFetch from '../query/lib/recursiveFetch.js';
import prepareForProcess from '../query/lib/prepareForProcess.js';
import Base from './namedQuery.base';

export default class extends Base {
    /**
     * Subscribe
     *
     * @param callback
     * @returns {null|any|*}
     */
    subscribe(callback) {
        this.subscriptionHandle = Meteor.subscribe(
            this.name,
            this.params,
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
     * @param args
     * @returns {*}
     */
    fetchOne(...args) {
        return _.first(this.fetch(...args));
    }

    /**
     * Gets the count of matching elements.
     * @param callback
     * @returns {any}
     */
    getCount(callback) {
        return new Promise((resolve, reject) => {
          Meteor.call(this.name + '.count', this.params, (error, result) => {
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
            Meteor.call(this.name, this.params, (error, result) => {
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
