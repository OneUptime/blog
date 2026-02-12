# How to Use Amazon Rekognition for Face Detection and Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Rekognition, Face Detection, Computer Vision

Description: Learn how to detect faces, analyze facial attributes, compare faces, and build face search collections with Amazon Rekognition's facial analysis APIs.

---

Facial analysis is one of Amazon Rekognition's most powerful feature sets. It goes well beyond simple "is there a face here?" detection. You can analyze facial attributes like emotions, age range, and whether the person is wearing glasses. You can compare two faces to see if they're the same person. And you can build searchable collections of faces for identification at scale.

The applications range from identity verification and access control to photo organization and user experience personalization. Let's dig into each capability.

## Face Detection and Attribute Analysis

Face detection finds every face in an image and returns detailed attributes for each one. This includes the bounding box, landmarks (eyes, nose, mouth positions), and attribute predictions.

```python
import boto3
import json

rekognition = boto3.client('rekognition', region_name='us-east-1')

def detect_faces(bucket, key):
    """Detect faces and analyze their attributes."""
    response = rekognition.detect_faces(
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        Attributes=['ALL']  # Use 'DEFAULT' for just bounding box
    )

    faces = response['FaceDetails']
    print(f"Found {len(faces)} face(s)\n")

    for i, face in enumerate(faces):
        print(f"Face {i + 1}:")

        # Bounding box
        box = face['BoundingBox']
        print(f"  Position: ({box['Left']:.2f}, {box['Top']:.2f})")
        print(f"  Size: {box['Width']:.2f} x {box['Height']:.2f}")

        # Confidence
        print(f"  Confidence: {face['Confidence']:.1f}%")

        # Age range
        age = face['AgeRange']
        print(f"  Age Range: {age['Low']}-{age['High']}")

        # Emotions (sorted by confidence)
        emotions = sorted(face['Emotions'], key=lambda x: x['Confidence'], reverse=True)
        top_emotion = emotions[0]
        print(f"  Primary Emotion: {top_emotion['Type']} ({top_emotion['Confidence']:.1f}%)")

        # Other attributes
        print(f"  Gender: {face['Gender']['Value']} ({face['Gender']['Confidence']:.1f}%)")
        print(f"  Smile: {face['Smile']['Value']} ({face['Smile']['Confidence']:.1f}%)")
        print(f"  Eyes Open: {face['EyesOpen']['Value']}")
        print(f"  Glasses: {face['Eyeglasses']['Value']}")
        print(f"  Sunglasses: {face['Sunglasses']['Value']}")
        print(f"  Beard: {face['Beard']['Value']}")
        print(f"  Mustache: {face['Mustache']['Value']}")

        # Face quality (useful for filtering low-quality detections)
        quality = face['Quality']
        print(f"  Brightness: {quality['Brightness']:.1f}")
        print(f"  Sharpness: {quality['Sharpness']:.1f}")
        print()

    return faces

faces = detect_faces('my-images', 'photos/group-photo.jpg')
```

## Face Comparison

Compare two faces to determine if they're the same person. This is the core of identity verification systems - think ID photo matching or login verification.

```python
def compare_faces(source_bucket, source_key, target_bucket, target_key, threshold=80):
    """Compare a face in the source image with faces in the target image."""
    response = rekognition.compare_faces(
        SourceImage={
            'S3Object': {'Bucket': source_bucket, 'Name': source_key}
        },
        TargetImage={
            'S3Object': {'Bucket': target_bucket, 'Name': target_key}
        },
        SimilarityThreshold=threshold
    )

    matches = response['FaceMatches']
    unmatched = response['UnmatchedFaces']

    if matches:
        for match in matches:
            similarity = match['Similarity']
            face = match['Face']
            box = face['BoundingBox']
            print(f"Match found! Similarity: {similarity:.1f}%")
            print(f"  Face position: ({box['Left']:.2f}, {box['Top']:.2f})")
    else:
        print("No matching faces found")

    print(f"Unmatched faces in target: {len(unmatched)}")

    return matches

# Compare an ID photo with a selfie for verification
matches = compare_faces(
    'verification-bucket', 'id-photos/user123.jpg',
    'verification-bucket', 'selfies/user123-selfie.jpg',
    threshold=90
)
```

## Building a Face Collection

Face collections let you store face signatures and search them later. This is how you build "who is this person?" functionality.

```python
def create_collection(collection_id):
    """Create a face collection for storing and searching faces."""
    try:
        response = rekognition.create_collection(CollectionId=collection_id)
        print(f"Collection created: {collection_id}")
        print(f"ARN: {response['CollectionArn']}")
        return True
    except rekognition.exceptions.ResourceAlreadyExistsException:
        print(f"Collection {collection_id} already exists")
        return True

def index_face(collection_id, bucket, key, external_id):
    """Add a face to the collection with an external ID for identification."""
    response = rekognition.index_faces(
        CollectionId=collection_id,
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        ExternalImageId=external_id,
        MaxFaces=1,  # Only index the largest face
        QualityFilter='AUTO',  # Skip low-quality faces
        DetectionAttributes=['ALL']
    )

    indexed = response['FaceRecords']
    unindexed = response['UnindexedFaces']

    if indexed:
        face_id = indexed[0]['Face']['FaceId']
        print(f"Indexed face {face_id} as '{external_id}'")
        return face_id
    else:
        reasons = [f['Reasons'] for f in unindexed]
        print(f"Failed to index: {reasons}")
        return None

# Create a collection and add faces
create_collection('employees')

# Index employee photos
employees = [
    ('photos/alice.jpg', 'alice-johnson'),
    ('photos/bob.jpg', 'bob-smith'),
    ('photos/carol.jpg', 'carol-williams'),
]

for photo, employee_id in employees:
    index_face('employees', 'company-photos', photo, employee_id)
```

## Searching for Faces

Once you have faces indexed, search the collection to identify unknown faces.

```python
def search_face(collection_id, bucket, key, threshold=80, max_results=5):
    """Search a face collection to identify a person."""
    response = rekognition.search_faces_by_image(
        CollectionId=collection_id,
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        FaceMatchThreshold=threshold,
        MaxFaces=max_results
    )

    matches = response['FaceMatches']
    searched_face = response['SearchedFaceBoundingBox']

    print(f"Searched face at: ({searched_face['Left']:.2f}, {searched_face['Top']:.2f})")

    if matches:
        for match in matches:
            face = match['Face']
            print(f"  Match: {face['ExternalImageId']} "
                  f"(similarity: {match['Similarity']:.1f}%, "
                  f"face ID: {face['FaceId'][:8]}...)")
    else:
        print("  No matches found")

    return matches

# Identify a person from a new photo
matches = search_face(
    'employees',
    'security-camera', 'capture-001.jpg',
    threshold=90
)
```

## Identity Verification System

Here's a complete identity verification flow that compares a government ID with a live selfie.

```python
class IdentityVerifier:
    """Verify identity by comparing ID photos with selfies."""

    def __init__(self, similarity_threshold=90):
        self.rekognition = boto3.client('rekognition', region_name='us-east-1')
        self.threshold = similarity_threshold

    def verify(self, id_image, selfie_image):
        """Run full verification pipeline.

        Args:
            id_image: Dict with 'Bucket' and 'Key' for the ID photo
            selfie_image: Dict with 'Bucket' and 'Key' for the selfie
        """
        result = {
            'verified': False,
            'similarity': 0,
            'checks': {}
        }

        # Step 1: Verify the selfie has exactly one face
        selfie_faces = self.rekognition.detect_faces(
            Image={'S3Object': selfie_image},
            Attributes=['ALL']
        )

        if len(selfie_faces['FaceDetails']) != 1:
            result['checks']['single_face'] = False
            result['reason'] = f"Expected 1 face, found {len(selfie_faces['FaceDetails'])}"
            return result
        result['checks']['single_face'] = True

        # Step 2: Check selfie quality
        face = selfie_faces['FaceDetails'][0]
        quality = face['Quality']

        if quality['Brightness'] < 40 or quality['Sharpness'] < 40:
            result['checks']['quality'] = False
            result['reason'] = "Selfie quality too low"
            return result
        result['checks']['quality'] = True

        # Step 3: Check eyes are open (liveness indicator)
        if not face['EyesOpen']['Value']:
            result['checks']['eyes_open'] = False
            result['reason'] = "Eyes appear to be closed"
            return result
        result['checks']['eyes_open'] = True

        # Step 4: Compare faces
        comparison = self.rekognition.compare_faces(
            SourceImage={'S3Object': id_image},
            TargetImage={'S3Object': selfie_image},
            SimilarityThreshold=self.threshold
        )

        if comparison['FaceMatches']:
            similarity = comparison['FaceMatches'][0]['Similarity']
            result['similarity'] = similarity
            result['verified'] = similarity >= self.threshold
            result['checks']['face_match'] = result['verified']
        else:
            result['checks']['face_match'] = False
            result['reason'] = "Face does not match ID photo"

        return result

# Usage
verifier = IdentityVerifier(similarity_threshold=92)
result = verifier.verify(
    id_image={'Bucket': 'kyc-docs', 'Key': 'user123/passport.jpg'},
    selfie_image={'Bucket': 'kyc-docs', 'Key': 'user123/selfie.jpg'}
)

print(f"Verified: {result['verified']}")
print(f"Similarity: {result['similarity']:.1f}%")
print(f"Checks: {json.dumps(result['checks'], indent=2)}")
```

## Managing Collections

Keep your collections clean and up to date.

```python
def list_collections():
    """List all face collections in the account."""
    response = rekognition.list_collections()
    for collection_id in response['CollectionIds']:
        # Get face count
        desc = rekognition.describe_collection(CollectionId=collection_id)
        print(f"  {collection_id}: {desc['FaceCount']} faces")

def remove_face(collection_id, face_id):
    """Remove a specific face from a collection."""
    response = rekognition.delete_faces(
        CollectionId=collection_id,
        FaceIds=[face_id]
    )
    print(f"Deleted {len(response['DeletedFaces'])} face(s)")

def delete_collection(collection_id):
    """Delete an entire face collection."""
    rekognition.delete_collection(CollectionId=collection_id)
    print(f"Deleted collection: {collection_id}")
```

## Important Considerations

Face detection and comparison come with ethical and legal responsibilities. Make sure you understand the regulations in your jurisdiction - many places have strict rules about biometric data. Always get informed consent before collecting or comparing facial data. Store face IDs and metadata securely, and have a clear data retention policy.

For monitoring the health of your Rekognition-powered applications, including API latency, error rates, and throughput, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view). For training custom visual models, see our post on [Rekognition Custom Labels](https://oneuptime.com/blog/post/amazon-rekognition-custom-labels/view).
