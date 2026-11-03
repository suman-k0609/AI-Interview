import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let modelInstance = null;
let isLoadingModel = false;

/**
 * Initialize or retrieve the cached COCO-SSD object detection model
 * Uses lite_mobilenet_v2 for ultra-fast real-time inference in browser
 */
export const getProctoringModel = async () => {
  if (modelInstance) return modelInstance;
  if (isLoadingModel) {
    // Wait for ongoing load
    while (isLoadingModel && !modelInstance) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return modelInstance;
  }

  try {
    isLoadingModel = true;
    console.log('🤖 Loading COCO-SSD neural network for anti-cheat & phone detection...');
    await tf.ready();
    modelInstance = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    console.log('✅ Proctoring Neural Network ready for real-time inference');
    return modelInstance;
  } catch (err) {
    console.error('Failed to load COCO-SSD model:', err);
    return null;
  } finally {
    isLoadingModel = false;
  }
};

/**
 * Run object detection on video frame to detect phones, secondary devices, or multiple people
 */
export const detectProctoringObjects = async (videoElement) => {
  if (!videoElement || videoElement.readyState < 2) return null;

  try {
    const model = await getProctoringModel();
    if (!model) return null;

    const predictions = await model.detect(videoElement);
    if (!predictions || predictions.length === 0) return { items: [], hasPhone: false, peopleCount: 0 };

    const phonePredictions = predictions.filter(
      (p) => p.class === 'cell phone' && p.score >= 0.40
    );

    const people = predictions.filter(
      (p) => p.class === 'person' && p.score >= 0.50
    );

    const secondaryDevices = predictions.filter(
      (p) => (p.class === 'laptop' || p.class === 'book') && p.score >= 0.45
    );

    return {
      allPredictions: predictions,
      hasPhone: phonePredictions.length > 0,
      phoneDetections: phonePredictions,
      peopleCount: people.length,
      hasMultiplePeople: people.length > 1,
      secondaryDevices,
      hasSecondaryDevice: secondaryDevices.length > 0
    };
  } catch (err) {
    console.warn('Proctoring inference warning:', err.message);
    return null;
  }
};
