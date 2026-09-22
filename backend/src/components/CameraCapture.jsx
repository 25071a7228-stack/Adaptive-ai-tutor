import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;

    videoRef.current
      .play()
      .catch((error) => {
        console.log("Video play:", error);
      });
  }, [cameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  };

  const startCamera = async () => {
    setCameraError("");
    setLoading(true);

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "LIVE_CAMERA_NOT_SUPPORTED"
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraOpen(true);
    } catch (error) {
      console.error("Camera error:", error);

      if (error.message === "LIVE_CAMERA_NOT_SUPPORTED") {
        setCameraError(
          "Live camera is not available here. Use Take Photo below."
        );
      } else if (error.name === "NotAllowedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        setCameraError(
          "No camera was found on this device."
        );
      } else if (error.name === "NotReadableError") {
        setCameraError(
          "The camera is being used by another application."
        );
      } else if (error.name === "SecurityError") {
        setCameraError(
          "Your browser blocked camera access. Use Take Photo below."
        );
      } else {
        setCameraError(
          "Unable to open the live camera. Use Take Photo below."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const captureLiveImage = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError(
        "Camera is still starting. Please wait a moment."
      );
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageUrl = canvas.toDataURL(
      "image/jpeg",
      0.9
    );

    setCapturedImage(imageUrl);

    stopCamera();

    if (onCapture) {
      onCapture(imageUrl);
    }
  };

  const handlePhoneCamera = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setCameraError("");

    const imageUrl = URL.createObjectURL(file);

    setCapturedImage(imageUrl);

    if (onCapture) {
      onCapture(imageUrl);
    }
  };

  const handleClose = () => {
    stopCamera();

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="camera-wrapper">

      {/* Header */}

      <div className="camera-header">
        <div>
          <div className="small-label">
            SMARTTUTOR CAMERA
          </div>

          <h3>
            Show me your work 📷
          </h3>
        </div>

        <button
          className="icon-button"
          onClick={handleClose}
          aria-label="Close camera"
        >
          ×
        </button>
      </div>

      {/* Error */}

      {cameraError && (
        <div className="camera-error">
          <div className="camera-error-icon">
            ⚠️
          </div>

          <div>
            <strong>
              Camera access issue
            </strong>

            <p>
              {cameraError}
            </p>
          </div>
        </div>
      )}

      {/* Live camera */}

      {cameraOpen && (
        <div className="camera-live-container">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />

          <div className="camera-controls">

            <button
              className="camera-capture-button"
              onClick={captureLiveImage}
            >
              <span>📸</span>
              Capture
            </button>

            <button
              className="camera-secondary-button"
              onClick={stopCamera}
            >
              Close
            </button>

          </div>
        </div>
      )}

      {/* Captured image */}

      {capturedImage && !cameraOpen && (
        <div className="camera-preview">

          <img
            src={capturedImage}
            alt="Captured work"
          />

          <div className="camera-preview-label">
            ✓ Photo captured
          </div>

          <button
            className="camera-secondary-button"
            onClick={() => {
              setCapturedImage(null);
            }}
          >
            Take Another Photo
          </button>

        </div>
      )}

      {/* Camera options */}

      {!cameraOpen && !capturedImage && (
        <div className="camera-options">

          <button
            className="camera-option-card"
            onClick={startCamera}
            disabled={loading}
          >
            <div className="camera-option-icon">
              📷
            </div>

            <div>
              <strong>
                {loading
                  ? "Opening camera..."
                  : "Open Camera"}
              </strong>

              <span>
                Use live camera
              </span>
            </div>
          </button>

          <button
            className="camera-option-card"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <div className="camera-option-icon">
              📸
            </div>

            <div>
              <strong>
                Take Photo
              </strong>

              <span>
                Use your phone camera
              </span>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoneCamera}
            style={{ display: "none" }}
          />

        </div>
      )}

      {/* Bottom explanation */}

      <div className="camera-help">
        <span>💡</span>

        <p>
          You can show SmartTutor a question,
          notebook page, or your working.
        </p>
      </div>

    </div>
  );
}