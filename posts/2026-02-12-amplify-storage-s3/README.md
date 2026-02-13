# How to Use Amplify Storage with S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, S3, Storage

Description: A practical guide to using AWS Amplify Storage backed by S3 for file uploads, downloads, access control, image handling, and progress tracking in web and mobile applications.

---

File storage is something most applications need eventually - profile photos, document uploads, media files, exported data. Amplify Storage wraps S3 with a developer-friendly API that handles authentication, access control, upload progress, and signed URLs without you having to configure IAM policies or generate pre-signed URLs manually.

Let's build a complete file management system using Amplify Storage.

## Setting Up Storage

Add storage to your Amplify project.

Configure storage with the CLI:

```bash
amplify add storage

# ? Select from one of the below mentioned services: Content (Images, audio, video, etc.)
# ? Provide a friendly name for your resource: appfiles
# ? Provide bucket name: my-app-files-bucket
# ? Who should have access: Auth users only
# ? What kind of access for Authenticated users? create/update, read, delete
# ? Do you want to add a Lambda Trigger for your S3 Bucket? No

amplify push
```

This creates an S3 bucket with IAM policies that restrict authenticated users to their own files.

## Basic File Operations

Amplify Storage provides five main operations: `uploadData`, `downloadData`, `getUrl`, `list`, and `remove`.

Here's the basic usage:

```javascript
import {
    uploadData,
    downloadData,
    getUrl,
    list,
    remove,
} from 'aws-amplify/storage';

// Upload a file
async function upload(key, file) {
    try {
        const result = await uploadData({
            key,
            data: file,
            options: {
                contentType: file.type,
            },
        }).result;

        console.log('Uploaded:', result.key);
        return result;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}

// Download a file
async function download(key) {
    try {
        const result = await downloadData({ key }).result;
        const blob = await result.body.blob();
        return blob;
    } catch (error) {
        console.error('Download failed:', error);
        throw error;
    }
}

// Get a signed URL for a file
async function getSignedUrl(key) {
    const result = await getUrl({
        key,
        options: {
            expiresIn: 3600, // URL valid for 1 hour
        },
    });
    return result.url.toString();
}

// List files
async function listFiles(prefix = '') {
    const result = await list({
        prefix,
        options: {
            listAll: true, // Get all files (not just first page)
        },
    });
    return result.items;
}

// Delete a file
async function deleteFile(key) {
    await remove({ key });
    console.log('Deleted:', key);
}
```

## Upload with Progress Tracking

For large files, you'll want to show upload progress to the user.

Here's how to track upload progress:

```javascript
function uploadWithProgress(key, file, onProgress) {
    const uploadTask = uploadData({
        key,
        data: file,
        options: {
            contentType: file.type,
            onProgress: ({ transferredBytes, totalBytes }) => {
                if (totalBytes) {
                    const percentage = Math.round((transferredBytes / totalBytes) * 100);
                    onProgress(percentage);
                }
            },
        },
    });

    // Return the task so it can be cancelled
    return {
        result: uploadTask.result,
        cancel: () => uploadTask.cancel(),
        pause: () => uploadTask.pause(),
        resume: () => uploadTask.resume(),
    };
}

// Usage in a React component
function FileUploader() {
    const [progress, setProgress] = useState(0);
    const [uploadTask, setUploadTask] = useState(null);

    async function handleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const key = `uploads/${Date.now()}-${file.name}`;
        const task = uploadWithProgress(key, file, setProgress);
        setUploadTask(task);

        try {
            await task.result;
            console.log('Upload complete!');
        } catch (error) {
            if (error.name === 'CancelledError') {
                console.log('Upload was cancelled');
            } else {
                console.error('Upload failed:', error);
            }
        }
    }

    function handleCancel() {
        uploadTask?.cancel();
    }

    return (
        <div>
            <input type="file" onChange={handleUpload} />
            {progress > 0 && (
                <div>
                    <div style={{ width: `${progress}%`, height: 4, background: 'blue' }} />
                    <span>{progress}%</span>
                    <button onClick={handleCancel}>Cancel</button>
                </div>
            )}
        </div>
    );
}
```

## Access Levels

Amplify Storage supports three access levels that control who can see what:

- **guest** - anyone can read (no authentication required)
- **protected** - authenticated users can read anyone's files, write only their own
- **private** - users can only access their own files

Here's how to use each level:

```javascript
// Upload to different access levels
async function uploadPublicFile(key, file) {
    return uploadData({
        key,
        data: file,
        options: {
            accessLevel: 'guest',
        },
    }).result;
}

async function uploadProtectedFile(key, file) {
    // Other users can read this, but only the owner can modify
    return uploadData({
        key,
        data: file,
        options: {
            accessLevel: 'protected',
        },
    }).result;
}

async function uploadPrivateFile(key, file) {
    // Only the uploading user can access this
    return uploadData({
        key,
        data: file,
        options: {
            accessLevel: 'private',
        },
    }).result;
}

// Access another user's protected files
async function getOtherUserFile(key, targetIdentityId) {
    const result = await getUrl({
        key,
        options: {
            accessLevel: 'protected',
            targetIdentityId, // The other user's Cognito identity ID
        },
    });
    return result.url.toString();
}
```

## Image Upload and Display Component

Here's a complete React component for uploading and displaying images.

A reusable image upload component:

```jsx
import { useState, useEffect } from 'react';
import { uploadData, getUrl, list, remove } from 'aws-amplify/storage';

function ImageGallery() {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Load existing images
    useEffect(() => {
        loadImages();
    }, []);

    async function loadImages() {
        try {
            const result = await list({
                prefix: 'photos/',
                options: { accessLevel: 'private' },
            });

            // Get signed URLs for each image
            const imageUrls = await Promise.all(
                result.items.map(async (item) => {
                    const url = await getUrl({
                        key: item.key,
                        options: { accessLevel: 'private' },
                    });
                    return {
                        key: item.key,
                        url: url.url.toString(),
                        size: item.size,
                        lastModified: item.lastModified,
                    };
                })
            );

            setImages(imageUrls);
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    }

    async function handleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        try {
            const key = `photos/${Date.now()}-${file.name}`;
            await uploadData({
                key,
                data: file,
                options: {
                    accessLevel: 'private',
                    contentType: file.type,
                },
            }).result;

            await loadImages(); // Refresh the gallery
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(key) {
        try {
            await remove({
                key,
                options: { accessLevel: 'private' },
            });
            setImages(images.filter(img => img.key !== key));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    }

    return (
        <div>
            <h2>Photo Gallery</h2>
            <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
            />
            {uploading && <p>Uploading...</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {images.map((img) => (
                    <div key={img.key}>
                        <img
                            src={img.url}
                            alt={img.key}
                            style={{ width: '100%', height: 200, objectFit: 'cover' }}
                        />
                        <button onClick={() => handleDelete(img.key)}>Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

## Lambda Trigger for Processing

You can add a Lambda trigger to process files after upload - resize images, scan for viruses, or extract metadata.

Add a Lambda trigger:

```bash
amplify update storage

# Select your storage resource
# ? Do you want to add a Lambda Trigger for your S3 Bucket? Yes
# ? Select from the following options: Create a new function

amplify push
```

The Lambda function receives S3 events:

```javascript
// amplify/backend/function/S3TriggerHandler/src/index.js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({});

exports.handler = async (event) => {
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        console.log(`Processing: ${bucket}/${key}`);

        // Only process images in the uploads prefix
        if (!key.startsWith('private/') || !key.match(/\.(jpg|jpeg|png|webp)$/i)) {
            continue;
        }

        try {
            // Get the original image
            const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            const imageBuffer = await streamToBuffer(response.Body);

            // Create a thumbnail
            const thumbnail = await sharp(imageBuffer)
                .resize(200, 200, { fit: 'cover' })
                .webp({ quality: 80 })
                .toBuffer();

            // Save the thumbnail
            const thumbKey = key.replace(/^(.*\/)?(.+)(\..+)$/, '$1thumbnails/$2.webp');
            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: thumbKey,
                Body: thumbnail,
                ContentType: 'image/webp',
            }));

            console.log(`Thumbnail created: ${thumbKey}`);
        } catch (error) {
            console.error(`Failed to process ${key}:`, error);
        }
    }
};

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}
```

For the authentication setup that makes this all work, see [using Amplify Authentication with Cognito](https://oneuptime.com/blog/post/2026-02-12-amplify-authentication-cognito/view). For direct AWS resource access patterns, see [using Cognito Identity Pools for AWS resource access](https://oneuptime.com/blog/post/2026-02-12-cognito-identity-pools-aws-resource-access/view).

## Wrapping Up

Amplify Storage makes S3 feel like a simple file system. The access level model (guest, protected, private) handles the most common authorization patterns without you writing IAM policies. Upload progress, signed URLs, and file listing all work through clean APIs. For more complex scenarios - like cross-user file sharing or fine-grained permissions - you can always drop down to the S3 SDK directly while still using Amplify for the authentication layer.
