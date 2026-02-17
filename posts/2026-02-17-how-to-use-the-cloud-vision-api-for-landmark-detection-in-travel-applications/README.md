# How to Use the Cloud Vision API for Landmark Detection in Travel Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Vision API, Landmark Detection, Travel Tech, Image Recognition

Description: Learn how to identify famous landmarks and locations in photos using Google Cloud Vision API landmark detection for building travel and tourism applications.

---

Travel apps thrive on helping users discover and identify places. When someone takes a photo of the Eiffel Tower, the Taj Mahal, or the Golden Gate Bridge, your app should be able to tell them exactly what they are looking at, along with useful context. Cloud Vision API's landmark detection does exactly this - it identifies well-known natural and man-made landmarks in images and returns their names, geographic coordinates, and confidence scores.

In this post, I will show you how to use landmark detection to build features for travel applications, from basic identification to building a full travel diary feature.

## What Landmark Detection Returns

For each detected landmark, the API provides:

- **Description**: The name of the landmark (e.g., "Eiffel Tower")
- **Score**: A confidence value between 0 and 1
- **Bounding polygon**: The area in the image where the landmark appears
- **Locations**: Geographic coordinates (latitude and longitude) associated with the landmark
- **Mid**: A Knowledge Graph entity ID that links to additional information

The API recognizes thousands of landmarks worldwide, including famous buildings, natural wonders, monuments, bridges, stadiums, and other notable locations.

## Basic Landmark Detection

Here is how to detect landmarks in a local image:

```python
from google.cloud import vision

def detect_landmarks(image_path):
    """Detect landmarks in a local image file."""
    client = vision.ImageAnnotatorClient()

    # Read the image
    with open(image_path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    # Run landmark detection
    response = client.landmark_detection(image=image, max_results=5)

    if response.error.message:
        raise Exception(f"API error: {response.error.message}")

    landmarks = response.landmark_annotations

    for landmark in landmarks:
        print(f"Landmark: {landmark.description}")
        print(f"  Confidence: {landmark.score:.2f}")
        print(f"  Entity ID: {landmark.mid}")

        # Print geographic coordinates
        for location in landmark.locations:
            lat = location.lat_lng.latitude
            lng = location.lat_lng.longitude
            print(f"  Location: ({lat:.6f}, {lng:.6f})")

        # Print bounding box
        vertices = landmark.bounding_poly.vertices
        print(f"  Bounding box: {[(v.x, v.y) for v in vertices]}")
        print()

    return landmarks

landmarks = detect_landmarks("travel_photo.jpg")
```

## Detecting Landmarks from URLs

For images already hosted online, you can pass a URL directly:

```python
from google.cloud import vision

def detect_landmarks_from_url(image_url):
    """Detect landmarks in an image from a URL."""
    client = vision.ImageAnnotatorClient()

    # Reference the image by URL
    image = vision.Image(
        source=vision.ImageSource(image_uri=image_url)
    )

    response = client.landmark_detection(image=image, max_results=5)
    landmarks = response.landmark_annotations

    results = []
    for landmark in landmarks:
        result = {
            "name": landmark.description,
            "confidence": landmark.score,
            "coordinates": [
                {"lat": loc.lat_lng.latitude, "lng": loc.lat_lng.longitude}
                for loc in landmark.locations
            ],
        }
        results.append(result)

    return results

# Detect landmarks from a publicly accessible image
results = detect_landmarks_from_url("https://example.com/eiffel-tower-photo.jpg")
```

## Building a Travel Photo Identifier

Here is a more complete example that identifies landmarks and enriches the results with useful travel information:

```python
from google.cloud import vision
import math

def identify_travel_photo(image_path):
    """
    Identify landmarks in a travel photo and return enriched results
    with distance calculations and map links.
    """
    client = vision.ImageAnnotatorClient()

    with open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)

    # Request both landmark detection and label detection
    features = [
        vision.Feature(type_=vision.Feature.Type.LANDMARK_DETECTION, max_results=5),
        vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=10),
    ]

    request = vision.AnnotateImageRequest(image=image, features=features)
    response = client.annotate_image(request=request)

    results = {
        "landmarks": [],
        "scene_labels": [],
    }

    # Process detected landmarks
    for landmark in response.landmark_annotations:
        landmark_info = {
            "name": landmark.description,
            "confidence": round(landmark.score, 3),
            "entity_id": landmark.mid,
        }

        if landmark.locations:
            lat = landmark.locations[0].lat_lng.latitude
            lng = landmark.locations[0].lat_lng.longitude
            landmark_info["coordinates"] = {"lat": lat, "lng": lng}

            # Generate a Google Maps link
            landmark_info["maps_url"] = (
                f"https://www.google.com/maps/@{lat},{lng},17z"
            )

        results["landmarks"].append(landmark_info)

    # Add scene context from labels
    for label in response.label_annotations:
        if label.score > 0.7:
            results["scene_labels"].append(label.description)

    return results

# Identify a travel photo
info = identify_travel_photo("vacation_photo.jpg")
print(f"Landmark: {info['landmarks'][0]['name']}")
print(f"Map: {info['landmarks'][0]['maps_url']}")
print(f"Scene: {', '.join(info['scene_labels'])}")
```

## Building a Travel Diary Feature

A practical travel app feature is automatically building a travel diary from a collection of photos:

```python
from google.cloud import vision
from datetime import datetime
import glob
import json

def build_travel_diary(photos_directory):
    """Build a travel diary from a directory of photos with landmarks."""
    client = vision.ImageAnnotatorClient()

    diary_entries = []
    image_files = sorted(glob.glob(f"{photos_directory}/*.jpg"))

    print(f"Processing {len(image_files)} photos...\n")

    for photo_path in image_files:
        with open(photo_path, "rb") as f:
            content = f.read()

        image = vision.Image(content=content)

        # Detect landmarks and labels together
        features = [
            vision.Feature(type_=vision.Feature.Type.LANDMARK_DETECTION, max_results=3),
            vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=5),
        ]

        request = vision.AnnotateImageRequest(image=image, features=features)
        response = client.annotate_image(request=request)

        entry = {
            "photo": photo_path,
            "landmarks": [],
            "labels": [l.description for l in response.label_annotations[:5]],
        }

        for lm in response.landmark_annotations:
            landmark_data = {"name": lm.description, "confidence": lm.score}
            if lm.locations:
                landmark_data["lat"] = lm.locations[0].lat_lng.latitude
                landmark_data["lng"] = lm.locations[0].lat_lng.longitude
            entry["landmarks"].append(landmark_data)

        if entry["landmarks"]:
            diary_entries.append(entry)
            primary = entry["landmarks"][0]["name"]
            print(f"  {photo_path}: {primary}")
        else:
            print(f"  {photo_path}: No landmarks detected")

    # Sort entries by location to create a route
    diary_entries.sort(
        key=lambda e: (
            e["landmarks"][0].get("lat", 0) if e["landmarks"] else 0
        )
    )

    # Save the diary
    output_path = f"{photos_directory}/travel_diary.json"
    with open(output_path, "w") as f:
        json.dump(diary_entries, f, indent=2)

    print(f"\nTravel diary saved to {output_path}")
    print(f"Found landmarks in {len(diary_entries)} out of {len(image_files)} photos")

    return diary_entries

# Build diary from vacation photos
diary = build_travel_diary("/path/to/vacation_photos")
```

## Calculating Distances Between Landmarks

For travel routing, you might want to calculate distances between detected landmarks:

```python
import math

def haversine_distance(lat1, lng1, lat2, lng2):
    """Calculate the distance in kilometers between two coordinates."""
    R = 6371  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    return R * c

def plan_landmark_route(diary_entries):
    """Plan a route between detected landmarks with distances."""
    landmarks_with_coords = [
        entry for entry in diary_entries
        if entry["landmarks"] and "lat" in entry["landmarks"][0]
    ]

    print("Landmark Route:")
    total_distance = 0

    for i in range(len(landmarks_with_coords)):
        current = landmarks_with_coords[i]["landmarks"][0]
        print(f"\n  Stop {i + 1}: {current['name']}")
        print(f"    Coordinates: ({current['lat']:.4f}, {current['lng']:.4f})")

        if i > 0:
            prev = landmarks_with_coords[i - 1]["landmarks"][0]
            dist = haversine_distance(
                prev["lat"], prev["lng"],
                current["lat"], current["lng"]
            )
            total_distance += dist
            print(f"    Distance from previous: {dist:.1f} km")

    print(f"\n  Total route distance: {total_distance:.1f} km")
```

## Limitations to Keep in Mind

Landmark detection works well but has some constraints:

- It only recognizes well-known landmarks. A local park bench or your neighborhood coffee shop will not be identified.
- The API needs a reasonable view of the landmark. Extreme close-ups or heavily obstructed views may not work.
- Confidence scores vary. An iconic view of a landmark from a common angle scores higher than an unusual perspective.
- Indoor shots of landmarks may not be detected even if the location is famous.

## Wrapping Up

Cloud Vision API landmark detection is a solid building block for travel applications. Combined with label detection for scene context and the geographic coordinates in the response, you can build features like automatic photo tagging, travel diaries, and location-based recommendations without training custom models.

For monitoring the reliability and response times of your travel application's API integrations, [OneUptime](https://oneuptime.com) provides comprehensive monitoring that helps ensure your users get a smooth experience.
