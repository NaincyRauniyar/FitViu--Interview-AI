import { useEffect, useRef } from 'react'
import * as faceapi from 'face-api.js'

/**
 * Invisible component that monitors webcam for:
 * - No face detected (3 consecutive checks)
 * - Multiple faces
 * - Suspicious gaze direction
 *
 * Models must be in /public/models/
 * Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
 * Required files:
 *   tiny_face_detector_model-shard1
 *   tiny_face_detector_model-weights_manifest.json
 *   face_landmark_68_tiny_model-shard1
 *   face_landmark_68_tiny_model-weights_manifest.json
 */
export default function FaceDetector({ webcamRef, onViolation }) {
  const intervalRef  = useRef(null)
  const loadedRef    = useRef(false)
  const noFaceCount  = useRef(0)

  useEffect(() => {
    loadAndStart()
    return () => clearInterval(intervalRef.current)
  }, [])

  const loadAndStart = async () => {
    if (loadedRef.current) return
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models')
      loadedRef.current = true
      intervalRef.current = setInterval(detect, 2500)
    } catch (e) {
      console.warn('face-api.js models not found in /public/models/. Face detection disabled.', e)
    }
  }

  const detect = async () => {
    const video = webcamRef.current?.video
    if (!video || video.readyState < 2) return

    try {
      const opts = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 })
      const dets = await faceapi
        .detectAllFaces(video, opts)
        .withFaceLandmarks(true)

      // No face
      if (dets.length === 0) {
        noFaceCount.current += 1
        if (noFaceCount.current >= 3) onViolation('No face detected (3+ checks)')
      } else {
        noFaceCount.current = 0
      }

      // Multiple faces
      if (dets.length > 1) onViolation(`Multiple faces detected (${dets.length})`)

      // Gaze estimation
      if (dets.length === 1) {
        const pts      = dets[0].landmarks.positions
        const noseTip  = pts[30]
        const leftEye  = pts[36]
        const rightEye = pts[45]
        const eyeMidX  = (leftEye.x + rightEye.x) / 2
        const faceW    = Math.abs(rightEye.x - leftEye.x)
        const offset   = Math.abs(noseTip.x - eyeMidX) / (faceW || 1)
        if (offset > 0.42) onViolation('Suspicious gaze direction')
      }
    } catch (e) {
      // Silently ignore detection errors (e.g. video not ready)
    }
  }

  return null
}
