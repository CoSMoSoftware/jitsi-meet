import { findIndex } from 'lodash';

import { CONNECTION_TYPE } from './constants';

const LOSS_AUDIO_THRESHOLDS = [ 0.33, 0.05 ];
const LOSS_VIDEO_THRESHOLDS = [ 0.33, 0.1, 0.05 ];

const THROUGHPUT_AUDIO_THRESHOLDS = [ 8, 20 ];
const THROUGHPUT_VIDEO_THRESHOLDS = [ 60, 750 ];

/**
 * Returns the level based on a list of thresholds.
 *
 * @param {number[]} thresholds - The thresholds array.
 * @param {number} value - The value against which the level is calculated.
 * @param {boolean} descending - The order based on which the level is calculated.
 *
 * @returns {number}
 */
function _getLevel(thresholds, value, descending = true) {
    let predicate;

    if (descending) {
        predicate = function(threshold) {
            return value > threshold;
        };
    } else {
        predicate = function(threshold) {
            return value < threshold;
        };
    }

    const i = findIndex(thresholds, predicate);

    if (i === -1) {
        return thresholds.length;
    }

    return i;
}

/**
 * Returns the connection details from the test results.
 *
 * @param {{
 *   fractionalLoss: number,
 *   throughput: number
 * }} testResults - The state of the app.
 *
 * @returns {{
 *   connectionType: string,
 *   connectionDetails: string[]
 * }}
 */
function _getConnectionDataFromTestResults({ fractionalLoss: l, throughput: t }) {
    const loss = {
        audioQuality: _getLevel(LOSS_AUDIO_THRESHOLDS, l),
        videoQuality: _getLevel(LOSS_VIDEO_THRESHOLDS, l)
    };
    const throughput = {
        audioQuality: _getLevel(THROUGHPUT_AUDIO_THRESHOLDS, t, false),
        videoQuality: _getLevel(THROUGHPUT_VIDEO_THRESHOLDS, t, false)
    };
    let connectionType = CONNECTION_TYPE.NONE;
    const connectionDetails = [];

    if (throughput.audioQuality === 0 || loss.audioQuality === 0) {
        // Calls are impossible.
        connectionType = CONNECTION_TYPE.POOR;
        connectionDetails.push('prejoin.connectionDetails.veryPoorConnection');
    } else if (
        throughput.audioQuality === 2
        && throughput.videoQuality === 2
        && loss.audioQuality === 2
        && loss.videoQuality === 3
    ) {
        // Ideal conditions for both audio and video. Show only one message.
        connectionType = CONNECTION_TYPE.GOOD;
        connectionDetails.push('prejoin.connectionDetails.goodQuality');
    } else {
        connectionType = CONNECTION_TYPE.NON_OPTIMAL;

        if (throughput.audioQuality === 1) {
            // Minimum requirements for a call are met.
            connectionDetails.push('prejoin.connectionDetails.audioLowNoVideo');
        } else {
            // There are two paragraphs: one saying something about audio and the other about video.
            if (loss.audioQuality === 1) {
                connectionDetails.push('prejoin.connectionDetails.audioClipping');
            } else {
                connectionDetails.push('prejoin.connectionDetails.audioHighQuality');
            }

            if (throughput.videoQuality === 0 || loss.videoQuality === 0) {
                connectionDetails.push('prejoin.connectionDetails.noVideo');
            } else if (throughput.videoQuality === 1) {
                connectionDetails.push('prejoin.connectionDetails.videoLowQuality');
            } else if (loss.videoQuality === 1) {
                connectionDetails.push('prejoin.connectionDetails.videoFreezing');
            } else if (loss.videoQuality === 2) {
                connectionDetails.push('prejoin.connectionDetails.videoTearing');
            } else {
                connectionDetails.push('prejoin.connectionDetails.videoHighQuality');
            }
        }
        connectionDetails.push('prejoin.connectionDetails.undetectable');
    }

    return {
        connectionType,
        connectionDetails
    };
}

/**
 * Selector for determining the connection type & details.
 *
 * @param {Object} state - The state of the app.
 * @returns {{
 *   connectionType: string,
 *   connectionDetails: string[]
 * }}
 */
export function getConnectionData(state) {
    const { precallTestResults } = state['features/prejoin'];

    if (precallTestResults) {
        if (precallTestResults.mediaConnectivity) {
            return _getConnectionDataFromTestResults(precallTestResults);
        }

        return {
            connectionType: CONNECTION_TYPE.POOR,
            connectionDetails: [ 'prejoin.connectionDetails.noMediaConnectivity' ]
        };
    }

    return {
        connectionType: CONNECTION_TYPE.NONE,
        connectionDetails: []
    };
}