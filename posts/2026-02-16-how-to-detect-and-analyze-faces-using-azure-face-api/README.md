# How to Detect and Analyze Faces Using Azure Face API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Face API, Computer Vision, AI, Facial Detection, Cognitive Services

Description: Use Azure Face API to detect faces in images and extract attributes like age, head pose, and accessories with practical Python examples.

---

Azure Face API is a cloud service that provides algorithms for detecting, recognizing, and analyzing human faces in images. It can find faces in photos, return their bounding box coordinates, and extract face attributes like head pose, blur level, and whether the person is wearing glasses. In this post, I will walk through using the Face API for detection and analysis, covering the setup process and practical code examples.

## Important Note on Responsible Use

Before diving in, it is worth noting that Microsoft has implemented access restrictions on Face API features. As of mid-2022, face identification, face verification, and emotion recognition features require an application for access through the Limited Access program. Face detection and basic attribute analysis are still generally available. This change reflects Microsoft's commitment to responsible AI practices. Make sure your use case complies with Microsoft's Responsible AI principles and any applicable regulations.

## Step 1: Create a Face API Resource

In the Azure Portal:

1. Search for "Face" in the marketplace.
2. Click "Create."
3. Select your subscription and resource group.
4. Choose a region and pricing tier (Free F0 allows 20 calls per minute, Standard S0 allows 10 calls per second).
5. Review and create.

Copy the endpoint and API key from the resource's "Keys and Endpoint" page.

## Step 2: Install the SDK

```bash
# Install the Azure Face SDK
pip install azure-cognitiveservices-vision-face
```

## Step 3: Detect Faces in an Image

The most basic operation is face detection - finding faces in an image and getting their bounding box coordinates.

```python
from azure.cognitiveservices.vision.face import FaceClient
from azure.cognitiveservices.vision.face.models import (
    FaceAttributeType,
    DetectionModel,
    RecognitionModel
)
from msrest.authentication import CognitiveServicesCredentials

# Configure the client
endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

face_client = FaceClient(endpoint, CognitiveServicesCredentials(key))

def detect_faces_from_url(image_url):
    """
    Detect faces in an image at a given URL.
    Returns a list of detected faces with their bounding rectangles.
    """
    detected_faces = face_client.face.detect_with_url(
        url=image_url,
        return_face_id=True,
        return_face_landmarks=True,       # Include facial landmark points
        return_face_attributes=[
            FaceAttributeType.head_pose,
            FaceAttributeType.glasses,
            FaceAttributeType.blur,
            FaceAttributeType.exposure,
            FaceAttributeType.noise,
            FaceAttributeType.occlusion,
            FaceAttributeType.accessories,
            FaceAttributeType.quality_for_recognition
        ],
        detection_model=DetectionModel.detection03,     # Latest detection model
        recognition_model=RecognitionModel.recognition04  # Latest recognition model
    )

    print(f"Detected {len(detected_faces)} face(s)")

    for i, face in enumerate(detected_faces):
        rect = face.face_rectangle
        print(f"\nFace {i + 1}:")
        print(f"  Position: top={rect.top}, left={rect.left}, "
              f"width={rect.width}, height={rect.height}")

        if face.face_attributes:
            attrs = face.face_attributes
            print(f"  Head pose: yaw={attrs.head_pose.yaw:.1f}, "
                  f"pitch={attrs.head_pose.pitch:.1f}, "
                  f"roll={attrs.head_pose.roll:.1f}")
            print(f"  Glasses: {attrs.glasses}")
            print(f"  Blur: {attrs.blur.blur_level}")
            print(f"  Exposure: {attrs.exposure.exposure_level}")

    return detected_faces


# Detect faces in an image
url = "https://example.com/group-photo.jpg"
faces = detect_faces_from_url(url)
```

## Step 4: Detect Faces from a Local File

```python
def detect_faces_from_file(image_path):
    """
    Detect faces in a local image file.
    Returns detected faces with all requested attributes.
    """
    with open(image_path, "rb") as image_stream:
        detected_faces = face_client.face.detect_with_stream(
            image=image_stream,
            return_face_id=True,
            return_face_landmarks=True,
            return_face_attributes=[
                FaceAttributeType.head_pose,
                FaceAttributeType.glasses,
                FaceAttributeType.blur,
                FaceAttributeType.exposure,
                FaceAttributeType.noise,
                FaceAttributeType.occlusion,
                FaceAttributeType.accessories,
                FaceAttributeType.quality_for_recognition
            ],
            detection_model=DetectionModel.detection03,
            recognition_model=RecognitionModel.recognition04
        )

    return detected_faces


# Detect faces in a local image
faces = detect_faces_from_file("team_photo.jpg")
```

## Step 5: Work with Face Landmarks

Face landmarks are specific points on a face like the nose tip, eye corners, and mouth outline. These are useful for understanding face orientation and for overlaying graphics.

```python
def analyze_landmarks(face):
    """
    Extract and display face landmark positions.
    Landmarks include eyes, nose, mouth, and eyebrow points.
    """
    landmarks = face.face_landmarks

    # Eye positions
    print("Eyes:")
    print(f"  Left eye: ({landmarks.pupil_left.x:.1f}, {landmarks.pupil_left.y:.1f})")
    print(f"  Right eye: ({landmarks.pupil_right.x:.1f}, {landmarks.pupil_right.y:.1f})")

    # Nose
    print("Nose:")
    print(f"  Tip: ({landmarks.nose_tip.x:.1f}, {landmarks.nose_tip.y:.1f})")

    # Mouth
    print("Mouth:")
    print(f"  Left: ({landmarks.mouth_left.x:.1f}, {landmarks.mouth_left.y:.1f})")
    print(f"  Right: ({landmarks.mouth_right.x:.1f}, {landmarks.mouth_right.y:.1f})")

    # Calculate inter-eye distance (useful for face size estimation)
    import math
    eye_distance = math.sqrt(
        (landmarks.pupil_right.x - landmarks.pupil_left.x) ** 2 +
        (landmarks.pupil_right.y - landmarks.pupil_left.y) ** 2
    )
    print(f"\nInter-eye distance: {eye_distance:.1f} pixels")

    return landmarks


# Analyze landmarks for each detected face
for i, face in enumerate(faces):
    print(f"\n--- Face {i + 1} Landmarks ---")
    analyze_landmarks(face)
```

## Step 6: Build a Face Quality Checker

A practical application of face detection is checking whether a photo meets quality requirements (for ID photos, profile pictures, etc.).

```python
def check_face_quality(image_path):
    """
    Check if an image contains a suitable face for an ID photo or profile picture.
    Returns a report with pass/fail criteria.
    """
    faces = detect_faces_from_file(image_path)
    report = {"passed": True, "issues": []}

    # Check: exactly one face
    if len(faces) == 0:
        report["passed"] = False
        report["issues"].append("No face detected in the image")
        return report
    elif len(faces) > 1:
        report["passed"] = False
        report["issues"].append(f"Multiple faces detected ({len(faces)}). Expected 1.")
        return report

    face = faces[0]
    attrs = face.face_attributes
    rect = face.face_rectangle

    # Check: face size (should be a significant portion of the image)
    # A face that is too small suggests the person is far from the camera
    if rect.width < 100 or rect.height < 100:
        report["passed"] = False
        report["issues"].append(
            f"Face is too small ({rect.width}x{rect.height} pixels). "
            "Move closer to the camera."
        )

    # Check: blur level
    if attrs.blur.blur_level != "low":
        report["passed"] = False
        report["issues"].append(
            f"Image is {attrs.blur.blur_level} blurry. "
            "Use a steady camera or better lighting."
        )

    # Check: exposure
    if attrs.exposure.exposure_level == "underExposure":
        report["passed"] = False
        report["issues"].append("Image is underexposed (too dark). Add more light.")
    elif attrs.exposure.exposure_level == "overExposure":
        report["passed"] = False
        report["issues"].append("Image is overexposed (too bright). Reduce lighting.")

    # Check: head pose (face should be roughly facing forward)
    head = attrs.head_pose
    if abs(head.yaw) > 20:
        report["passed"] = False
        report["issues"].append(
            f"Face is turned too far sideways (yaw: {head.yaw:.1f} degrees). "
            "Please face the camera directly."
        )
    if abs(head.pitch) > 20:
        report["passed"] = False
        report["issues"].append(
            f"Face is tilted up/down too much (pitch: {head.pitch:.1f} degrees). "
            "Look straight at the camera."
        )

    # Check: occlusion
    if attrs.occlusion.forehead_occluded:
        report["issues"].append("Forehead is partially covered. Remove hats or hair.")
    if attrs.occlusion.eye_occluded:
        report["passed"] = False
        report["issues"].append("Eyes are occluded. Remove obstructions.")
    if attrs.occlusion.mouth_occluded:
        report["issues"].append("Mouth is partially covered.")

    # Check: recognition quality
    quality = attrs.quality_for_recognition
    if quality == "low":
        report["passed"] = False
        report["issues"].append(
            "Overall face quality is too low for reliable recognition. "
            "Retake the photo in better conditions."
        )

    if report["passed"]:
        report["message"] = "Photo meets quality requirements."
    else:
        report["message"] = f"Photo has {len(report['issues'])} issue(s). Please fix and retry."

    return report


# Check a photo
result = check_face_quality("profile_photo.jpg")
print(f"\nResult: {'PASS' if result['passed'] else 'FAIL'}")
print(result["message"])
for issue in result["issues"]:
    print(f"  - {issue}")
```

## Using the REST API Directly

If you prefer not to use the SDK, you can call the Face API directly via REST:

```python
import requests

def detect_faces_rest(image_path, endpoint, key):
    """
    Detect faces using the REST API directly.
    Useful when the SDK is not available for your language or platform.
    """
    url = f"{endpoint}face/v1.0/detect"
    params = {
        "returnFaceId": "true",
        "returnFaceLandmarks": "true",
        "returnFaceAttributes": "headPose,glasses,blur,exposure",
        "detectionModel": "detection_03",
        "recognitionModel": "recognition_04"
    }
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream"
    }

    with open(image_path, "rb") as f:
        response = requests.post(url, params=params, headers=headers, data=f)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None
```

## Detection Model Comparison

Azure Face API offers multiple detection models:

| Model | Best For |
|-------|----------|
| detection_01 | General face detection (legacy) |
| detection_02 | Improved accuracy, especially for small and side-facing faces |
| detection_03 | Latest model with best accuracy. Recommended for new projects. |

Use `detection_03` for new projects. It handles challenging conditions better, including small faces, side profiles, and partially occluded faces. However, note that it does not support all face attributes that `detection_01` supports. Check the documentation for the specific attributes available with each model.

## Error Handling and Rate Limits

```python
import time

def detect_with_retry(image_path, max_retries=3):
    """
    Detect faces with retry logic for rate limiting.
    The Free tier is limited to 20 calls per minute.
    """
    for attempt in range(max_retries):
        try:
            return detect_faces_from_file(image_path)
        except Exception as e:
            if "429" in str(e):
                wait = 2 ** attempt  # Exponential backoff
                print(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                raise
    raise Exception("Max retries exceeded")
```

## Wrapping Up

Azure Face API provides a straightforward way to detect and analyze faces in images. The combination of face detection, landmark extraction, and attribute analysis enables practical applications like photo quality validation, face counting in crowds, and accessibility features. Always consider the responsible use implications of facial analysis technology, ensure you comply with Microsoft's Limited Access requirements for sensitive features, and design your applications with user privacy in mind. Start with face detection and attribute analysis for your initial prototype, and apply for Limited Access features only if your use case genuinely requires identification or verification capabilities.
