import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  User,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Sliders,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Hand,
  Eye,
  EyeOff,
  Moon,
  Smartphone,
  Users,
  Shield,
  RefreshCw
} from 'lucide-react';
import { detectProctoringObjects, getProctoringModel } from '../services/proctoringService';

export default function CandidateVideoFeed({
  candidateName = 'Candidate',
  isSpeaking = false,
  isMicActive = true,
  onToggleMic,
  onVolumeChange,
  onVisionStatusChange,
  onProctoringViolation
}) {
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(isMicActive);
  const [blurBackground, setBlurBackground] = useState(false);
  const [stream, setStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [permissionErrorDetail, setPermissionErrorDetail] = useState('');
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);

  // Vision detection status: 'active' | 'blocked' | 'phone_detected' | 'multiple_people' | 'no_face' | 'too_dark' | 'off'
  const [visionStatus, setVisionStatus] = useState('active');
  const [phoneDetections, setPhoneDetections] = useState([]);
  const [multiplePeopleDetected, setMultiplePeopleDetected] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const visionIntervalRef = useRef(null);
  const objectIntervalRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const lastViolationTimeRef = useRef(0);

  // Preload COCO-SSD object detection neural network
  useEffect(() => {
    getProctoringModel().then((model) => {
      if (model) setModelReady(true);
    });
  }, []);

  // Sync mic state from parent if passed
  useEffect(() => {
    setMicEnabled(isMicActive);
  }, [isMicActive]);

  // Initialize Native Browser FaceDetector if supported
  useEffect(() => {
    if ('FaceDetector' in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      } catch (e) {
        console.warn('Native FaceDetector initialization note:', e);
      }
    }
  }, []);

  // Setup real-time audio analyzer for candidate speech visualization
  const setupAudioAnalyser = (mediaStream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(avg);
          if (onVolumeChange) onVolumeChange(avg);
        }
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (audioErr) {
      console.warn('AudioContext visualization initialization note:', audioErr);
    }
  };

  // Resilient Media Initializer (Camera & Mic with Graceful Fallbacks)
  const startMedia = async (userInitiated = false) => {
    if (isRequestingMedia) return;
    setIsRequestingMedia(true);
    setPermissionErrorDetail('');

    try {
      let mediaStream = null;

      // Strategy 1: Try combined video and audio
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
      } catch (combinedErr) {
        console.warn('Combined getUserMedia failed, attempting sequential video fallback:', combinedErr.name, combinedErr.message);

        // Strategy 2: Fallback to video only (remove constraints that may fail on USB/virtual cams)
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (videoErr) {
          throw videoErr;
        }

        // Try adding audio track separately so an audio error doesn't kill the camera
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach((track) => mediaStream.addTrack(track));
        } catch (audioErr) {
          console.warn('Microphone stream access unavailable or denied:', audioErr.message);
        }
      }

      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Stop previous stream if any
      if (streamRef.current && streamRef.current !== mediaStream) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraEnabled(true);
      setHasPermissionError(false);
      setPermissionErrorDetail('');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      if (mediaStream.getAudioTracks().length > 0) {
        setupAudioAnalyser(mediaStream);
      }
    } catch (err) {
      console.error('Webcam/Mic access denied or unavailable:', err.name, err.message);
      setHasPermissionError(true);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionErrorDetail('Camera blocked by browser. Please allow camera permissions in your address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionErrorDetail('No camera detected. Please plug in or connect a webcam.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionErrorDetail('Camera is currently used by another application. Close it and retry.');
      } else {
        setPermissionErrorDetail(err.message || 'Camera access error.');
      }
    } finally {
      setIsRequestingMedia(false);
    }
  };

  // Mount Effect
  useEffect(() => {
    isMountedRef.current = true;
    startMedia(false);

    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Guarantee that whenever <video> mounts or stream updates, srcObject is connected
  useEffect(() => {
    if (videoRef.current && stream && cameraEnabled && !hasPermissionError) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play catch:', err);
      });
    }
  }, [stream, cameraEnabled, hasPermissionError]);

  // REAL-TIME AI NEURAL OBJECT DETECTION (Cell Phone & Multiple People Detection)
  useEffect(() => {
    if (!cameraEnabled || hasPermissionError) return;

    const runObjectDetection = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const result = await detectProctoringObjects(video);
        if (!result) return;

        if (result.hasPhone) {
          setPhoneDetections(result.phoneDetections);
          setVisionStatus('phone_detected');

          // Throttled notification to avoid spamming parent
          const now = Date.now();
          if (now - lastViolationTimeRef.current > 2500) {
            lastViolationTimeRef.current = now;
            if (onProctoringViolation) {
              onProctoringViolation({
                type: 'PHONE_DETECTED',
                message: 'Cell phone detected in video frame',
                confidence: Math.round(result.phoneDetections[0].score * 100)
              });
            }
          }
        } else {
          setPhoneDetections([]);
        }

        if (result.hasMultiplePeople) {
          setMultiplePeopleDetected(true);
          const now = Date.now();
          if (now - lastViolationTimeRef.current > 3000) {
            lastViolationTimeRef.current = now;
            if (onProctoringViolation) {
              onProctoringViolation({
                type: 'MULTIPLE_PEOPLE',
                message: `${result.peopleCount} people detected in camera frame`
              });
            }
          }
        } else {
          setMultiplePeopleDetected(false);
        }
      } catch (e) {
        console.warn('Object detection frame error:', e);
      }
    };

    objectIntervalRef.current = setInterval(runObjectDetection, 550);

    return () => {
      if (objectIntervalRef.current) {
        clearInterval(objectIntervalRef.current);
      }
    };
  }, [cameraEnabled, hasPermissionError]);

  // REAL-TIME COMPUTER VISION FRAME ANALYZER (Lens Occlusion / Hand on camera / Luminance)
  useEffect(() => {
    if (!cameraEnabled || hasPermissionError) {
      setVisionStatus('off');
      return;
    }

    const analyzeFrame = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      // Don't override active phone detection status
      if (phoneDetections.length > 0) return;

      try {
        // Native Face Detector API if available
        let detectedNativeFaces = null;
        if (faceDetectorRef.current) {
          try {
            const faces = await faceDetectorRef.current.detect(video);
            detectedNativeFaces = faces;
          } catch (fdErr) {
            // Fallback
          }
        }

        // Off-screen canvas pixel luminance & contrast analysis
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
          canvasRef.current.width = 64;
          canvasRef.current.height = 48;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, 64, 48);
        const frame = ctx.getImageData(0, 0, 64, 48);
        const data = frame.data;
        const totalPixels = 64 * 48;

        let totalLuminance = 0;
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        const luminances = new Float32Array(totalPixels);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          rTotal += r;
          gTotal += g;
          bTotal += b;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          luminances[i / 4] = lum;
          totalLuminance += lum;
        }

        const meanLuminance = totalLuminance / totalPixels;
        const avgR = rTotal / totalPixels;
        const avgG = gTotal / totalPixels;
        const avgB = bTotal / totalPixels;

        // Calculate standard deviation of luminance (Contrast & Texture)
        let sumSquaredDiff = 0;
        for (let i = 0; i < totalPixels; i++) {
          const diff = luminances[i] - meanLuminance;
          sumSquaredDiff += diff * diff;
        }
        const stdDevLuminance = Math.sqrt(sumSquaredDiff / totalPixels);

        // Hand or Obstacle placed on camera
        const isHandOrObstacle =
          (meanLuminance < 22 && stdDevLuminance < 16) ||
          (stdDevLuminance < 13 && avgR > avgB * 1.4 && meanLuminance < 95);

        const isTooDark = meanLuminance < 18;

        let status = 'active';

        if (isHandOrObstacle) {
          status = 'blocked';
        } else if (isTooDark) {
          status = 'too_dark';
        } else if (detectedNativeFaces && detectedNativeFaces.length === 0) {
          status = 'no_face';
        } else if (stdDevLuminance < 18) {
          status = 'no_face';
        } else {
          status = 'active';
        }

        setVisionStatus(status);
        if (onVisionStatusChange) {
          onVisionStatusChange(status);
        }
      } catch (err) {
        // Silent catch
      }
    };

    visionIntervalRef.current = setInterval(analyzeFrame, 350);

    return () => {
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current);
      }
    };
  }, [cameraEnabled, hasPermissionError, phoneDetections.length]);

  // Handle Camera Toggle
  const toggleCamera = () => {
    if (!stream || stream.getVideoTracks().length === 0 || hasPermissionError) {
      startMedia(true);
      return;
    }
    const nextState = !cameraEnabled;
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setCameraEnabled(nextState);
    if (!nextState) {
      setVisionStatus('off');
    } else {
      setVisionStatus('active');
    }
  };

  // Handle Mic Toggle
  const toggleMic = () => {
    const nextMic = !micEnabled;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = nextMic;
      });
    }
    setMicEnabled(nextMic);
    if (onToggleMic) onToggleMic(nextMic);
  };

  // Speaking detection based on audio volume or prop
  const isCandidateTalking = isSpeaking || (micEnabled && audioLevel > 28);

  const videoWidth = videoRef.current?.videoWidth || 640;
  const videoHeight = videoRef.current?.videoHeight || 480;

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl flex flex-col justify-between aspect-[16/10] sm:aspect-[16/9] w-full group">
      {/* VIDEO / AVATAR LAYER */}
      <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
        {cameraEnabled && !hasPermissionError ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${
                blurBackground ? 'blur-xs' : ''
              }`}
            />

            {/* AI COMPUTER VISION BOUNDING BOXES FOR DETECTED PHONES */}
            {phoneDetections.map((det, idx) => {
              const [x, y, w, h] = det.bbox;
              // Mirror X coordinate since candidate video is flipped horizontally
              const leftPercent = ((videoWidth - x - w) / videoWidth) * 100;
              const topPercent = (y / videoHeight) * 100;
              const widthPercent = (w / videoWidth) * 100;
              const heightPercent = (h / videoHeight) * 100;

              return (
                <div
                  key={idx}
                  className="absolute z-15 border-2 border-rose-500 rounded-lg pointer-events-none transition-all duration-100 shadow-[0_0_15px_rgba(244,63,94,0.7)]"
                  style={{
                    left: `${Math.max(2, Math.min(95, leftPercent))}%`,
                    top: `${Math.max(2, Math.min(95, topPercent))}%`,
                    width: `${Math.max(5, Math.min(90, widthPercent))}%`,
                    height: `${Math.max(5, Math.min(90, heightPercent))}%`
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded shadow flex items-center gap-1 whitespace-nowrap animate-pulse">
                    <Smartphone className="w-3 h-3" />
                    <span>PHONE {Math.round(det.score * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Avatar fallback when camera is off */
          <div className="flex flex-col items-center justify-center p-4 text-center max-w-xs z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-xl mb-2.5 border-2 border-indigo-400/40">
              {candidateName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'YOU'}
            </div>
            <p className="text-xs font-bold text-slate-200">{candidateName} (You)</p>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-2.5 leading-snug">
              {permissionErrorDetail || (hasPermissionError ? 'Camera access needed for interview' : 'Camera is currently turned off')}
            </p>

            {/* Direct Enable / Allow Camera Button */}
            <button
              type="button"
              onClick={() => startMedia(true)}
              disabled={isRequestingMedia}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isRequestingMedia ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting Camera...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>{hasPermissionError ? 'Enable Camera / Allow' : 'Turn On Camera'}</span>
                </>
              )}
            </button>

            {hasPermissionError && (
              <p className="text-[10px] text-indigo-300 mt-2 bg-indigo-950/70 border border-indigo-500/30 rounded-lg px-2.5 py-1.5 leading-tight">
                💡 <span className="font-semibold">Browser note:</span> Click the 🔒 or 🎥 icon on the left of your URL bar (<span className="text-white font-mono">localhost:5173</span>) and toggle <b>Camera</b> to <b>Allow</b>.
              </p>
            )}
          </div>
        )}

        {/* Ambient Dark Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

        {/* 🚨 PROCTORING WARNING: CELL PHONE DETECTED BANNER */}
        {phoneDetections.length > 0 && (
          <div className="absolute inset-0 z-30 bg-rose-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center border-2 border-rose-500 animate-in fade-in duration-150 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-rose-600/30 border border-rose-500 flex items-center justify-center mb-2 animate-bounce">
              <Smartphone className="w-6 h-6 text-rose-300" />
            </div>
            <p className="text-sm font-black text-white tracking-wider uppercase">
              🚨 Anti-Cheat: Cell Phone Detected
            </p>
            <p className="text-xs text-rose-200 mt-1 max-w-xs font-medium">
              Secondary mobile device detected by AI vision. Mobile devices are strictly prohibited during this interview.
            </p>
          </div>
        )}

        {/* 🚨 PROCTORING WARNING: MULTIPLE PEOPLE DETECTED */}
        {multiplePeopleDetected && phoneDetections.length === 0 && (
          <div className="absolute top-12 left-3 right-3 z-25 bg-amber-950/95 border border-amber-500 text-amber-200 text-[10px] sm:text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 shadow-xl animate-in slide-in-from-top-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>Multiple individuals detected in camera frame. Candidate must be alone.</span>
          </div>
        )}

        {/* OCCLUSION / HAND OVER CAMERA WARNING OVERLAY */}
        {visionStatus === 'blocked' && phoneDetections.length === 0 && (
          <div className="absolute inset-0 z-20 bg-rose-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center border-2 border-rose-500 animate-in fade-in duration-200 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-rose-600/30 border border-rose-500 flex items-center justify-center mb-2 animate-bounce">
              <Hand className="w-6 h-6 text-rose-300" />
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
              Camera Lens Obstructed
            </p>
            <p className="text-[10px] sm:text-xs text-rose-200 mt-0.5 max-w-xs">
              Hand or object detected covering the camera. Please keep the lens clear.
            </p>
          </div>
        )}
      </div>

      {/* TOP BAR: Candidate Tag & Dynamic AI Computer Vision Status */}
      <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 backdrop-blur-md bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white">{candidateName} (You)</span>
          <span className="text-[9px] font-semibold text-slate-400">Proctored Feed</span>
        </div>

        {/* DYNAMIC REAL-TIME COMPUTER VISION & ANTI-CHEAT BADGE */}
        {phoneDetections.length > 0 ? (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-rose-950/95 text-rose-200 px-3 py-1.5 rounded-xl border border-rose-500 text-[10px] font-black shadow-lg shadow-rose-950/70 animate-pulse">
            <Smartphone className="w-3.5 h-3.5 text-rose-400" />
            <span>Phone Detected ({Math.round(phoneDetections[0].score * 100)}%)</span>
          </div>
        ) : multiplePeopleDetected ? (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-amber-950/90 text-amber-200 px-2.5 py-1 rounded-xl border border-amber-500 text-[10px] font-bold">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Multiple People</span>
          </div>
        ) : visionStatus === 'blocked' ? (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-rose-950/90 text-rose-300 px-2.5 py-1 rounded-xl border border-rose-500/60 text-[10px] font-bold shadow-lg shadow-rose-950/50 animate-pulse">
            <Hand className="w-3.5 h-3.5 text-rose-400" />
            <span>Camera Obstructed</span>
          </div>
        ) : visionStatus === 'no_face' ? (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-amber-950/90 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-500/50 text-[10px] font-bold shadow-lg">
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Face Not In Frame</span>
          </div>
        ) : visionStatus === 'too_dark' ? (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-slate-900/90 text-slate-300 px-2.5 py-1 rounded-xl border border-slate-700 text-[10px] font-bold">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>Low Visibility</span>
          </div>
        ) : visionStatus === 'off' ? (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] text-slate-400">
            <CameraOff className="w-3 h-3" />
            <span>Video Off</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-emerald-950/80 text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-500/40 text-[10px] font-bold shadow-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Proctored: Clear</span>
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Controls & Live Mic Indicator */}
      <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between gap-2">
        {/* Speaking status with dynamic equalizer */}
        <div className="flex items-center gap-2 backdrop-blur-md bg-slate-900/85 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          {micEnabled ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCandidateTalking ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className={`text-[11px] font-semibold ${isCandidateTalking ? 'text-emerald-300' : 'text-slate-400'}`}>
                {isCandidateTalking ? 'Speaking...' : 'Mic Ready'}
              </span>

              {/* Dynamic Equalizer */}
              <div className="flex items-end gap-0.5 h-3 ml-1">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                    style={{
                      height: isCandidateTalking
                        ? `${Math.max(3, Math.min(12, (audioLevel / 10) * bar))}`
                        : '3px'
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-semibold">
              <MicOff className="w-3 h-3" />
              <span>Mic Muted</span>
            </div>
          )}
        </div>

        {/* Video / Mic Toggle buttons */}
        <div className="flex items-center gap-1.5 backdrop-blur-md bg-slate-900/85 p-1 rounded-xl border border-slate-800">
          {/* Mic Toggle */}
          <button
            onClick={toggleMic}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              micEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
            }`}
            title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micEnabled ? <Mic className="w-3.5 h-3.5 text-indigo-400" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              cameraEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
            }`}
            title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraEnabled ? <Camera className="w-3.5 h-3.5 text-indigo-400" /> : <CameraOff className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Blur Background Toggle */}
          <button
            onClick={() => setBlurBackground((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              blurBackground
                ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Toggle Virtual Background Blur"
          >
            Blur
          </button>
        </div>
      </div>
    </div>
  );
}
