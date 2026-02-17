# How to Integrate Firebase Cloud Storage with GCP Cloud Storage Buckets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Cloud Storage, Buckets, Integration

Description: Understand the relationship between Firebase Cloud Storage and GCP Cloud Storage buckets and learn how to use both SDKs to manage your storage effectively.

---

Here is something that confuses a lot of developers when they first start with Firebase: Firebase Cloud Storage and Google Cloud Storage are the same thing. When you create a Firebase project and use Cloud Storage through the Firebase SDK, you are using a regular Google Cloud Storage bucket. The Firebase SDK just provides a friendlier client-side API with built-in security rules integration. This means you can access the same bucket from both the Firebase client SDK and the GCP server-side SDK, and that opens up a lot of possibilities.

## The Default Firebase Storage Bucket

When you enable Cloud Storage in Firebase, it creates a default bucket named after your project:

```
YOUR_PROJECT_ID.appspot.com
```

This bucket is a standard GCS bucket. You can see it in the Google Cloud Console under Cloud Storage, and you can interact with it using `gsutil`, the Cloud Storage client libraries, or the Firebase SDK.

Verify this by listing your buckets:

```bash
# List all buckets in your project - you will see the Firebase bucket
gsutil ls -p YOUR_PROJECT_ID
```

## Creating Additional Buckets for Firebase

The default bucket works for simple apps, but you often want separate buckets for different purposes - user uploads, public assets, backups, etc.

Create additional buckets using gsutil:

```bash
# Create a bucket for user profile images
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://YOUR_PROJECT_ID-profile-images

# Create a bucket for temporary processing files
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://YOUR_PROJECT_ID-temp-processing

# Create a bucket for public assets with uniform access
gsutil mb -p YOUR_PROJECT_ID -l us-central1 -b on gs://YOUR_PROJECT_ID-public-assets
```

To use these additional buckets from the Firebase client SDK, reference them explicitly:

```javascript
// Using the default bucket
import { getStorage, ref, uploadBytes } from "firebase/storage";

const defaultStorage = getStorage();
const defaultRef = ref(defaultStorage, "uploads/file.txt");

// Using a custom bucket
const profileStorage = getStorage(app, "gs://YOUR_PROJECT_ID-profile-images");
const profileRef = ref(profileStorage, "avatars/user123.jpg");
```

## Uploading Files with the Firebase SDK

The Firebase SDK handles client-side uploads with built-in security rules enforcement.

This code uploads a file from a web application:

```javascript
// upload.js - Client-side upload with Firebase SDK
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const storage = getStorage();

async function uploadFile(file, path, onProgress) {
  const storageRef = ref(storage, path);

  // Create an upload task with resumable upload
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: getCurrentUserId(),
      originalName: file.name
    }
  });

  // Monitor upload progress
  return new Promise((resolve, reject) => {
    uploadTask.on("state_changed",
      (snapshot) => {
        // Track progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        // Handle errors
        console.error("Upload failed:", error.code);
        reject(error);
      },
      async () => {
        // Upload complete - get the download URL
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ downloadURL, path });
      }
    );
  });
}
```

## Accessing the Same Files with the GCP SDK

On the server side, you can access the same bucket and files using the Google Cloud Storage Node.js library. This is useful in Cloud Functions, Cloud Run services, or any backend code.

This Cloud Function processes files that were uploaded through the Firebase client:

```typescript
// functions/src/process-upload.ts
import * as functions from "firebase-functions";
import { Storage } from "@google-cloud/storage";

// The GCP Storage client connects to the same buckets
const storage = new Storage();

export const processUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const bucket = storage.bucket(object.bucket);
    const file = bucket.file(object.name!);

    console.log(`Processing uploaded file: ${object.name}`);
    console.log(`Content type: ${object.contentType}`);
    console.log(`Size: ${object.size} bytes`);

    // Read the file metadata (same metadata set by Firebase SDK)
    const [metadata] = await file.getMetadata();
    console.log("Custom metadata:", metadata.metadata);

    // Download the file for processing
    const [contents] = await file.download();

    // Process the file (example: validate a CSV)
    if (object.contentType === "text/csv") {
      const rows = contents.toString().split("\n");
      console.log(`CSV has ${rows.length} rows`);

      // Write processed results to another location
      const resultFile = bucket.file(`processed/${object.name}.json`);
      await resultFile.save(JSON.stringify({
        originalFile: object.name,
        rowCount: rows.length,
        processedAt: new Date().toISOString()
      }));
    }
  });
```

## Configuring Firebase Security Rules for Storage

Firebase Security Rules control client-side access. Server-side access through the Admin SDK or GCP SDK bypasses these rules entirely.

Here are comprehensive security rules for a multi-bucket setup:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // User profile images - users can only manage their own
    match /avatars/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // Public uploads - anyone authenticated can upload, everyone can read
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024;
    }

    // Private documents - only the owner
    match /private/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // Shared team files
    match /teams/{teamId}/{allPaths=**} {
      allow read: if request.auth != null
                  && isTeamMember(teamId);
      allow write: if request.auth != null
                   && isTeamAdmin(teamId);
    }
  }
}
```

## Using gsutil for Bulk Operations

The gsutil command line tool is perfect for bulk operations on your Firebase Storage buckets.

These commands demonstrate common administrative tasks:

```bash
# List all files in a specific path
gsutil ls -la gs://YOUR_PROJECT_ID.appspot.com/uploads/

# Copy files between buckets
gsutil -m cp -r gs://YOUR_PROJECT_ID.appspot.com/uploads/* \
  gs://YOUR_PROJECT_ID-backup/uploads/

# Set lifecycle rules to auto-delete old temp files
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 7,
          "matchesPrefix": ["temp/"]
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["archives/"]
        }
      }
    ]
  }
}
EOF
gsutil lifecycle set lifecycle.json gs://YOUR_PROJECT_ID.appspot.com

# Enable versioning for the bucket
gsutil versioning set on gs://YOUR_PROJECT_ID.appspot.com

# Set CORS configuration for the bucket
cat > cors.json << 'EOF'
[
  {
    "origin": ["https://yourdomain.com"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json gs://YOUR_PROJECT_ID.appspot.com
```

## Generating Signed URLs for Temporary Access

Sometimes you need to grant temporary access to a file without going through Firebase Auth. Signed URLs are perfect for this.

This Cloud Function generates signed URLs for files:

```typescript
// functions/src/signed-url.ts
import * as functions from "firebase-functions";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();

export const getSignedUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { filePath, action = "read" } = data;

  const bucket = storage.bucket("YOUR_PROJECT_ID.appspot.com");
  const file = bucket.file(filePath);

  // Check if the file exists
  const [exists] = await file.exists();
  if (!exists) {
    throw new functions.https.HttpsError("not-found", "File not found");
  }

  // Generate a signed URL valid for 15 minutes
  const [signedUrl] = await file.getSignedUrl({
    action: action,
    expires: Date.now() + 15 * 60 * 1000 // 15 minutes
  });

  return { url: signedUrl };
});
```

## Cross-Bucket Operations in Cloud Functions

Cloud Functions can read from one bucket and write to another. This is useful for data pipelines.

This function copies processed files from a staging bucket to a production bucket:

```typescript
// functions/src/promote-assets.ts
export const promoteAsset = functions.https.onCall(async (data, context) => {
  // Verify admin role
  if (context.auth?.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admins only");
  }

  const { filePath } = data;
  const sourceBucket = storage.bucket("YOUR_PROJECT_ID-staging");
  const destBucket = storage.bucket("YOUR_PROJECT_ID-production");

  // Copy the file from staging to production
  await sourceBucket.file(filePath).copy(destBucket.file(filePath));

  // Make the production copy publicly readable
  await destBucket.file(filePath).makePublic();

  const publicUrl = `https://storage.googleapis.com/YOUR_PROJECT_ID-production/${filePath}`;
  return { publicUrl };
});
```

## Summary

Firebase Cloud Storage and GCP Cloud Storage are the same service viewed through different lenses. The Firebase SDK gives you client-side uploads with security rules, while the GCP SDK gives you server-side power with signed URLs, lifecycle management, and cross-bucket operations. Use them together - upload through Firebase on the client, process with GCP tools on the server, manage with gsutil for admin tasks. The data is always in the same place, just accessed through whichever API makes sense for the context.
