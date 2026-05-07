# How to Use Camera Devices in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Camera, Video, V4L2, Container, Computer Vision

Description: Learn how to pass camera and video capture devices into Podman containers for computer vision, video conferencing, surveillance, and media applications.

---

> Giving Podman containers access to camera devices enables containerized computer vision pipelines, video processing applications, and testing environments that interact with real camera hardware.

Camera access in containers is essential for building containerized computer vision applications, video processing pipelines, quality assurance systems, and any workload that needs to capture live video. Linux exposes cameras through the Video4Linux2 (V4L2) subsystem as device files under `/dev/video*`. Podman can pass these devices into containers with a simple `--device` flag. This guide covers camera passthrough setup, practical examples with OpenCV and GStreamer, and tips for handling multiple cameras.

---

## Understanding Camera Devices in Linux

Linux uses the Video4Linux2 (V4L2) framework to provide a unified interface for video capture devices.

```bash
# List all video devices

ls -la /dev/video*
# Example output:
# crw-rw----+ 1 root video 81, 0 Mar 18 08:00 /dev/video0
# crw-rw----+ 1 root video 81, 1 Mar 18 08:00 /dev/video1
# crw-rw----+ 1 root video 81, 2 Mar 18 08:00 /dev/video2
# crw-rw----+ 1 root video 81, 3 Mar 18 08:00 /dev/video3

# Note: Each physical camera may create multiple /dev/video* entries
# (one for video capture, one for metadata, etc.)

# Get detailed information about a video device
v4l2-ctl --device=/dev/video0 --all 2>/dev/null | head -30

# List supported formats and resolutions
v4l2-ctl --device=/dev/video0 --list-formats-ext

# Check camera capabilities
v4l2-ctl --device=/dev/video0 --list-ctrls
```

### User Permissions

```bash
# Add your user to the video group for rootless access
sudo usermod -aG video $USER
# Log out and back in

# Verify
groups | grep video
```

## Basic Camera Passthrough

```bash
# Pass a single camera device to a container
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  fedora:latest \
  bash -c "dnf install -y v4l-utils && v4l2-ctl --device=/dev/video0 --all"

# Pass multiple video devices
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  --device /dev/video1:/dev/video1 \
  fedora:latest \
  bash -c "dnf install -y v4l-utils && v4l2-ctl --list-devices"
```

## Capturing Images with FFmpeg

```bash
# Capture a single frame from the camera
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  -v /tmp/camera-output:/output:Z \
  --group-add keep-groups \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y ffmpeg && \
           ffmpeg -f v4l2 -video_size 1280x720 -i /dev/video0 \
           -frames:v 1 /output/snapshot.jpg && \
           echo 'Captured snapshot to /output/snapshot.jpg'"

# Record 10 seconds of video
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  -v /tmp/camera-output:/output:Z \
  --group-add keep-groups \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y ffmpeg && \
           ffmpeg -f v4l2 -video_size 1280x720 -framerate 30 \
           -i /dev/video0 -t 10 -c:v libx264 \
           /output/recording.mp4 && \
           echo 'Recorded 10 seconds to /output/recording.mp4'"
```

## OpenCV Camera Access in Containers

OpenCV is the most popular library for computer vision. Here is how to use it with camera devices in Podman.

### Building an OpenCV Container

```bash
mkdir -p /tmp/camera-demo
cat > /tmp/camera-demo/Containerfile << 'EOF'
FROM python:3.11-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    v4l-utils \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    opencv-python-headless \
    numpy \
    Pillow

WORKDIR /app

CMD ["python3"]
EOF

podman build -t opencv-camera:latest -f /tmp/camera-demo/Containerfile /tmp/camera-demo/
```

### Capturing Frames with OpenCV

```bash
cat > /tmp/camera-demo/capture.py << 'EOF'
import cv2
import sys
import time
import os

def list_cameras(max_cameras=10):
    """Detect available camera devices."""
    available = []
    for i in range(max_cameras):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                available.append(i)
            cap.release()
    return available

def capture_snapshot(device_id=0, output_path="/output/snapshot.jpg"):
    """Capture a single frame from the camera."""
    cap = cv2.VideoCapture(device_id)
    if not cap.isOpened():
        print(f"Error: Cannot open camera {device_id}")
        return False

    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # Read frame properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(f"Camera {device_id}: {width}x{height} @ {fps} FPS")

    # Capture a frame (skip first few frames for auto-exposure)
    for _ in range(10):
        cap.read()

    ret, frame = cap.read()
    if ret:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, frame)
        print(f"Snapshot saved to {output_path}")
        print(f"Image size: {frame.shape[1]}x{frame.shape[0]}, {frame.shape[2]} channels")
    else:
        print("Error: Failed to capture frame")

    cap.release()
    return ret

def capture_video(device_id=0, output_path="/output/video.avi", duration=5):
    """Record video for a specified duration."""
    cap = cv2.VideoCapture(device_id)
    if not cap.isOpened():
        print(f"Error: Cannot open camera {device_id}")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    print(f"Recording {duration}s of video at {width}x{height} @ {fps} FPS...")
    start_time = time.time()
    frame_count = 0

    while (time.time() - start_time) < duration:
        ret, frame = cap.read()
        if ret:
            out.write(frame)
            frame_count += 1
        else:
            break

    elapsed = time.time() - start_time
    print(f"Recorded {frame_count} frames in {elapsed:.1f}s ({frame_count/elapsed:.1f} FPS)")
    print(f"Video saved to {output_path}")

    cap.release()
    out.release()

if __name__ == "__main__":
    # Detect cameras
    cameras = list_cameras()
    print(f"Found cameras: {cameras}")

    if not cameras:
        print("No cameras detected! Check device passthrough.")
        sys.exit(1)

    # Capture a snapshot from the first camera
    capture_snapshot(cameras[0], "/output/snapshot.jpg")

    # Record 5 seconds of video
    capture_video(cameras[0], "/output/recording.avi", duration=5)
EOF

# Run the OpenCV camera capture
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  --group-add keep-groups \
  -v /tmp/camera-output:/output:Z \
  -v /tmp/camera-demo:/app:Z \
  opencv-camera:latest \
  python3 /app/capture.py
```

## Motion Detection Example

```bash
cat > /tmp/camera-demo/motion_detect.py << 'EOF'
import cv2
import numpy as np
import time
import os

def detect_motion(device_id=0, threshold=25, min_area=500, duration=30):
    """Simple motion detection using frame differencing."""
    cap = cv2.VideoCapture(device_id)
    if not cap.isOpened():
        print(f"Error: Cannot open camera {device_id}")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print(f"Starting motion detection for {duration} seconds...")
    print(f"Threshold: {threshold}, Min area: {min_area}")

    # Read the first frame as reference
    ret, prev_frame = cap.read()
    if not ret:
        print("Error: Failed to capture initial frame")
        cap.release()
        return

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    prev_gray = cv2.GaussianBlur(prev_gray, (21, 21), 0)

    start_time = time.time()
    motion_events = 0
    output_dir = "/output/motion"
    os.makedirs(output_dir, exist_ok=True)

    while (time.time() - start_time) < duration:
        ret, frame = cap.read()
        if not ret:
            break

        # Convert to grayscale and blur
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        # Compute frame difference
        delta = cv2.absdiff(prev_gray, gray)
        thresh = cv2.threshold(delta, threshold, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)

        # Find contours of moving objects
        contours, _ = cv2.findContours(
            thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        motion_detected = False
        for contour in contours:
            if cv2.contourArea(contour) > min_area:
                motion_detected = True
                (x, y, w, h) = cv2.boundingRect(contour)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        if motion_detected:
            motion_events += 1
            timestamp = time.strftime('%H%M%S')
            filepath = os.path.join(output_dir, f"motion_{timestamp}_{motion_events}.jpg")
            cv2.imwrite(filepath, frame)
            print(f"Motion detected! Event #{motion_events} saved to {filepath}")

        prev_gray = gray
        time.sleep(0.1)  # ~10 FPS for motion detection

    cap.release()
    print(f"\nMotion detection complete. {motion_events} events in {duration} seconds.")

if __name__ == "__main__":
    detect_motion(device_id=0, duration=30)
EOF

# Run motion detection
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  --group-add keep-groups \
  -v /tmp/camera-output:/output:Z \
  -v /tmp/camera-demo:/app:Z \
  opencv-camera:latest \
  python3 /app/motion_detect.py
```

## GStreamer Camera Pipeline

```bash
# Use GStreamer for camera capture
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  --group-add keep-groups \
  -v /tmp/camera-output:/output:Z \
  ubuntu:22.04 \
  bash -c "apt-get update && \
           apt-get install -y gstreamer1.0-tools gstreamer1.0-plugins-good \
           gstreamer1.0-plugins-base v4l-utils && \
           gst-launch-1.0 v4l2src device=/dev/video0 num-buffers=1 ! \
           jpegenc ! filesink location=/output/gst_snapshot.jpg && \
           echo 'GStreamer snapshot saved'"
```

## Multiple Camera Setup

```bash
# Pass multiple cameras to a single container
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  --device /dev/video2:/dev/video2 \
  --group-add keep-groups \
  -v /tmp/camera-output:/output:Z \
  -v /tmp/camera-demo:/app:Z \
  opencv-camera:latest \
  python3 -c "
import cv2
for i in [0, 2]:
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            cv2.imwrite(f'/output/camera_{i}.jpg', frame)
            print(f'Camera {i}: {frame.shape[1]}x{frame.shape[0]} - captured')
        cap.release()
    else:
        print(f'Camera {i}: not available')
"
```

## RTSP Streaming from a Container

```bash
# Publish camera feed to an RTSP server from a container
cat > /tmp/camera-demo/stream.sh << 'EOF'
#!/bin/bash
# Publish camera via RTSP using ffmpeg. Start an RTSP server first.
RTSP_URL="${RTSP_URL:-rtsp://host.containers.internal:8554/live}"
echo "Publishing RTSP stream to ${RTSP_URL}"
ffmpeg -f v4l2 -video_size 640x480 -framerate 30 \
  -i /dev/video0 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f rtsp -rtsp_transport tcp "${RTSP_URL}"
EOF
chmod +x /tmp/camera-demo/stream.sh

# Run the publishing container
podman run --rm -it \
  --device /dev/video0:/dev/video0 \
  --group-add keep-groups \
  -e RTSP_URL=rtsp://host.containers.internal:8554/live \
  -v /tmp/camera-demo:/app:Z \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y ffmpeg && bash /app/stream.sh"
```

## Virtual Cameras with v4l2loopback

You can create virtual camera devices and pass them to containers:

```bash
# Install v4l2loopback on the host
sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="Virtual Camera"

# The virtual camera appears as /dev/video10
ls -la /dev/video10

# Pass the virtual camera to a container
podman run --rm -it \
  --device /dev/video10:/dev/video10 \
  --group-add keep-groups \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y v4l-utils && \
           v4l2-ctl --device=/dev/video10 --all"
```

## Troubleshooting

```bash
# Camera not detected in container
# Verify the device exists on the host
ls -la /dev/video0
v4l2-ctl --device=/dev/video0 --info

# Permission denied
# Check user groups
groups | grep video
# Use --group-add keep-groups flag

# Camera busy (another application using it)
fuser /dev/video0
# or
lsof /dev/video0

# Wrong video device (metadata node vs capture node)
# Use v4l2-ctl to identify the correct device
v4l2-ctl --list-devices
# Pick the device listed under "Video Capture" not "Video Metadata"

# Low frame rate or timeout
# Try a lower resolution
v4l2-ctl --device=/dev/video0 --list-formats-ext
# Use a resolution the camera natively supports

# SELinux blocking (Fedora/RHEL)
sudo setsebool -P container_use_devices=true
```

## Conclusion

Camera devices in Podman containers work through the standard V4L2 device passthrough mechanism. By mapping `/dev/video*` devices into your container with the `--device` flag, you get direct access to camera hardware for capture, processing, and streaming. Combined with tools like OpenCV, FFmpeg, and GStreamer, you can build complete computer vision pipelines that run in isolated, reproducible container environments. For rootless operation, ensure your user is in the `video` group and use `--group-add keep-groups` to preserve group permissions inside the container.
