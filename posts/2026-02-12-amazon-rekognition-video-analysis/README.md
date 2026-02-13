# How to Use Amazon Rekognition for Video Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Rekognition, Video Analysis, Computer Vision

Description: Learn how to analyze video content with Amazon Rekognition for label detection, face tracking, content moderation, and text extraction from video streams.

---

Video analysis with Amazon Rekognition lets you extract insights from stored videos and live streams without building your own computer vision pipeline. You can detect objects and activities, track people across frames, find inappropriate content, and extract text - all through API calls. The service handles the frame-by-frame processing, so you don't have to worry about extracting frames, running inference, or stitching results together.

Rekognition Video works in two modes: stored video analysis (for files in S3) and streaming video analysis (for live feeds via Kinesis Video Streams). Let's cover both.

## Stored Video Analysis

For videos stored in S3, you start an asynchronous analysis job and get the results when it completes. The pattern is: start the job, get a job ID, poll for completion, then retrieve results.

```python
import boto3
import json
import time

rekognition = boto3.client('rekognition', region_name='us-east-1')

def start_label_detection(bucket, key, sns_topic_arn=None, role_arn=None):
    """Start detecting labels (objects, scenes, activities) in a video."""
    params = {
        'Video': {
            'S3Object': {
                'Bucket': bucket,
                'Name': key
            }
        },
        'MinConfidence': 70,
        'Features': ['GENERAL_LABELS']
    }

    # Optional: get notified via SNS when the job completes
    if sns_topic_arn and role_arn:
        params['NotificationChannel'] = {
            'SNSTopicArn': sns_topic_arn,
            'RoleArn': role_arn
        }

    response = rekognition.start_label_detection(**params)
    job_id = response['JobId']
    print(f"Label detection started: {job_id}")
    return job_id
```

## Getting Results

Rekognition returns results paginated. Each label detection includes a timestamp so you know exactly when in the video each object appears.

```python
def get_label_results(job_id):
    """Retrieve label detection results, handling pagination."""
    labels_by_timestamp = {}
    next_token = None

    while True:
        params = {'JobId': job_id, 'MaxResults': 100}
        if next_token:
            params['NextToken'] = next_token

        response = rekognition.get_label_detection(**params)
        status = response['JobStatus']

        if status == 'IN_PROGRESS':
            print("Job still in progress...")
            time.sleep(10)
            continue
        elif status == 'FAILED':
            print(f"Job failed: {response.get('StatusMessage', 'Unknown error')}")
            return None

        # Process this page of results
        for label_detection in response['Labels']:
            timestamp = label_detection['Timestamp']  # Milliseconds
            label = label_detection['Label']

            if timestamp not in labels_by_timestamp:
                labels_by_timestamp[timestamp] = []

            labels_by_timestamp[timestamp].append({
                'name': label['Name'],
                'confidence': label['Confidence'],
                'instances': label.get('Instances', [])
            })

        # Check for more pages
        next_token = response.get('NextToken')
        if not next_token:
            break

    print(f"Processed {len(labels_by_timestamp)} timestamps")
    return labels_by_timestamp

# Start analysis and get results
job_id = start_label_detection('my-video-bucket', 'videos/office-tour.mp4')

# Wait for the job to complete
time.sleep(30)  # Give it a head start
results = get_label_results(job_id)

# Show what was detected at different timestamps
for timestamp in sorted(list(results.keys()))[:10]:
    seconds = timestamp / 1000
    labels = [l['name'] for l in results[timestamp]]
    print(f"  {seconds:.1f}s: {', '.join(labels)}")
```

## Face Detection in Videos

Track faces throughout a video, including their attributes at each appearance.

```python
def analyze_video_faces(bucket, key):
    """Detect and track faces throughout a video."""
    # Start face detection job
    response = rekognition.start_face_detection(
        Video={'S3Object': {'Bucket': bucket, 'Name': key}},
        FaceAttributes='ALL'
    )
    job_id = response['JobId']
    print(f"Face detection started: {job_id}")

    # Wait for completion
    while True:
        result = rekognition.get_face_detection(JobId=job_id)
        if result['JobStatus'] == 'SUCCEEDED':
            break
        elif result['JobStatus'] == 'FAILED':
            print("Face detection failed")
            return None
        time.sleep(10)

    # Process face detections
    faces_timeline = []
    next_token = None

    while True:
        params = {'JobId': job_id, 'MaxResults': 100}
        if next_token:
            params['NextToken'] = next_token

        result = rekognition.get_face_detection(**params)

        for detection in result['Faces']:
            timestamp = detection['Timestamp']
            face = detection['Face']

            emotions = sorted(
                face.get('Emotions', []),
                key=lambda x: x['Confidence'],
                reverse=True
            )

            faces_timeline.append({
                'timestamp_ms': timestamp,
                'timestamp_s': timestamp / 1000,
                'age_range': face.get('AgeRange', {}),
                'top_emotion': emotions[0]['Type'] if emotions else 'UNKNOWN',
                'smile': face.get('Smile', {}).get('Value', False),
                'bounding_box': face.get('BoundingBox', {})
            })

        next_token = result.get('NextToken')
        if not next_token:
            break

    print(f"Found {len(faces_timeline)} face detections")
    return faces_timeline

# Analyze faces in a video
timeline = analyze_video_faces('my-videos', 'meeting-recording.mp4')
```

## Video Content Moderation

Automatically scan videos for inappropriate content. This is critical for user-generated content platforms.

```python
def moderate_video(bucket, key):
    """Scan a video for inappropriate content."""
    response = rekognition.start_content_moderation(
        Video={'S3Object': {'Bucket': bucket, 'Name': key}},
        MinConfidence=60
    )
    job_id = response['JobId']

    # Wait for completion
    while True:
        result = rekognition.get_content_moderation(JobId=job_id)
        if result['JobStatus'] != 'IN_PROGRESS':
            break
        time.sleep(10)

    if result['JobStatus'] == 'FAILED':
        return None

    # Collect moderation labels
    flags = []
    next_token = None

    while True:
        params = {'JobId': job_id, 'MaxResults': 100}
        if next_token:
            params['NextToken'] = next_token

        result = rekognition.get_content_moderation(**params)

        for mod in result['ModerationLabels']:
            flags.append({
                'timestamp_s': mod['Timestamp'] / 1000,
                'label': mod['ModerationLabel']['Name'],
                'parent': mod['ModerationLabel'].get('ParentName', ''),
                'confidence': mod['ModerationLabel']['Confidence']
            })

        next_token = result.get('NextToken')
        if not next_token:
            break

    if flags:
        print(f"Found {len(flags)} moderation flags:")
        for flag in flags:
            print(f"  {flag['timestamp_s']:.1f}s - {flag['label']} "
                  f"({flag['confidence']:.1f}%)")
    else:
        print("No inappropriate content detected")

    return flags

moderate_video('uploads', 'user-video-456.mp4')
```

## Text Detection in Videos

Extract text that appears in video frames - useful for analyzing presentations, slides, signs, and captions.

```python
def detect_video_text(bucket, key):
    """Detect text in a video."""
    response = rekognition.start_text_detection(
        Video={'S3Object': {'Bucket': bucket, 'Name': key}},
        Filters={
            'WordFilter': {
                'MinConfidence': 80,
                'MinBoundingBoxHeight': 0.02  # Skip tiny text
            }
        }
    )
    job_id = response['JobId']

    # Wait for job completion
    while True:
        result = rekognition.get_text_detection(JobId=job_id)
        if result['JobStatus'] != 'IN_PROGRESS':
            break
        time.sleep(10)

    # Collect text detections
    text_by_time = {}
    next_token = None

    while True:
        params = {'JobId': job_id, 'MaxResults': 100}
        if next_token:
            params['NextToken'] = next_token

        result = rekognition.get_text_detection(**params)

        for detection in result['TextDetections']:
            ts = detection['Timestamp']
            text_det = detection['TextDetection']

            if text_det['Type'] == 'LINE':
                if ts not in text_by_time:
                    text_by_time[ts] = []
                text_by_time[ts].append(text_det['DetectedText'])

        next_token = result.get('NextToken')
        if not next_token:
            break

    # Print unique text found
    all_text = set()
    for ts, texts in text_by_time.items():
        for t in texts:
            all_text.add(t)

    print(f"Unique text found in video ({len(all_text)} items):")
    for text in sorted(all_text):
        print(f"  - {text}")

    return text_by_time
```

## Streaming Video Analysis

For live video feeds, use Kinesis Video Streams with Rekognition's stream processor.

```python
def create_stream_processor(
    collection_id,
    kinesis_video_stream_arn,
    kinesis_data_stream_arn,
    role_arn
):
    """Create a stream processor for real-time face recognition."""
    response = rekognition.create_stream_processor(
        Input={
            'KinesisVideoStream': {
                'Arn': kinesis_video_stream_arn
            }
        },
        Output={
            'KinesisDataStream': {
                'Arn': kinesis_data_stream_arn
            }
        },
        Name='security-camera-processor',
        Settings={
            'FaceSearch': {
                'CollectionId': collection_id,
                'FaceMatchThreshold': 85
            }
        },
        RoleArn=role_arn
    )

    processor_arn = response['StreamProcessorArn']
    print(f"Stream processor created: {processor_arn}")

    # Start the processor
    rekognition.start_stream_processor(Name='security-camera-processor')
    print("Stream processor started - processing live video")

    return processor_arn
```

## Building a Video Analysis Pipeline

Here's a complete pipeline that processes uploaded videos with multiple analysis types.

```python
class VideoAnalysisPipeline:
    """Complete video analysis pipeline with multiple detectors."""

    def __init__(self):
        self.rekognition = boto3.client('rekognition', region_name='us-east-1')

    def analyze(self, bucket, key, analyses=None):
        """Run multiple analyses on a video."""
        if analyses is None:
            analyses = ['labels', 'faces', 'moderation', 'text']

        jobs = {}

        # Start all jobs in parallel
        if 'labels' in analyses:
            resp = self.rekognition.start_label_detection(
                Video={'S3Object': {'Bucket': bucket, 'Name': key}},
                MinConfidence=70
            )
            jobs['labels'] = resp['JobId']

        if 'moderation' in analyses:
            resp = self.rekognition.start_content_moderation(
                Video={'S3Object': {'Bucket': bucket, 'Name': key}},
                MinConfidence=60
            )
            jobs['moderation'] = resp['JobId']

        if 'text' in analyses:
            resp = self.rekognition.start_text_detection(
                Video={'S3Object': {'Bucket': bucket, 'Name': key}}
            )
            jobs['text'] = resp['JobId']

        print(f"Started {len(jobs)} analysis jobs")

        # Wait for all jobs to complete
        results = {}
        for analysis_type, job_id in jobs.items():
            print(f"Waiting for {analysis_type}...")
            results[analysis_type] = self._wait_for_job(analysis_type, job_id)

        return results

    def _wait_for_job(self, analysis_type, job_id):
        """Wait for a specific job type to complete."""
        get_methods = {
            'labels': self.rekognition.get_label_detection,
            'moderation': self.rekognition.get_content_moderation,
            'text': self.rekognition.get_text_detection
        }

        get_method = get_methods[analysis_type]

        while True:
            response = get_method(JobId=job_id, MaxResults=1)
            if response['JobStatus'] != 'IN_PROGRESS':
                return response['JobStatus']
            time.sleep(15)

# Usage
pipeline = VideoAnalysisPipeline()
results = pipeline.analyze('my-videos', 'content/product-demo.mp4')
```

Video analysis is resource-intensive, so keep an eye on costs. Only run the analysis types you actually need, and consider using content-based triggers (like running moderation only on user-uploaded content). For monitoring your Rekognition video processing alongside other AWS services, check out our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view). For image-specific analysis, see our guide on [Amazon Rekognition for image analysis](https://oneuptime.com/blog/post/2026-02-12-amazon-rekognition-image-analysis/view).
