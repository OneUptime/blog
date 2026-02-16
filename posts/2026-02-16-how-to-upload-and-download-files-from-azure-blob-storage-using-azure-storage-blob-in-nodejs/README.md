# How to Upload and Download Files from Azure Blob Storage Using @azure/storage-blob in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Blob Storage, Node.js, File Upload, Cloud Storage, Azure SDK, JavaScript, REST API

Description: Learn how to upload and download files from Azure Blob Storage using the @azure/storage-blob SDK in Node.js with Express for building file management APIs.

---

Azure Blob Storage is the go-to service for storing unstructured data in Azure. Files, images, videos, backups, logs - it handles them all with high durability and global availability. The `@azure/storage-blob` SDK for Node.js provides a clean, promise-based API for interacting with Blob Storage. Combined with Express.js, you can build a file management API in a few hours.

In this post, we will build a complete file management service using Node.js and the `@azure/storage-blob` SDK. We will cover uploading files (including large files with streaming), downloading, listing, deleting, and generating temporary access URLs.

## Setting Up the Project

Initialize a Node.js project and install the dependencies.

```bash
mkdir blob-storage-demo
cd blob-storage-demo
npm init -y

# Install dependencies
npm install express multer @azure/storage-blob @azure/identity dotenv
```

- `express` - web framework
- `multer` - middleware for handling file uploads
- `@azure/storage-blob` - Blob Storage SDK
- `@azure/identity` - authentication (optional, for managed identity)
- `dotenv` - environment variable management

## Configuration

Create a `.env` file for your Azure Storage connection details.

```bash
# .env
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=myfilestorage;AccountKey=your-key;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=uploads
PORT=3000
```

## Initializing the Blob Service Client

Create a module that sets up the Blob Storage client.

```javascript
// src/storage.js
const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config();

// Create the BlobServiceClient from the connection string
const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);

// Get a reference to the container
const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_NAME
);

// Ensure the container exists when the app starts
async function initializeContainer() {
    const exists = await containerClient.exists();
    if (!exists) {
        await containerClient.create();
        console.log(`Container '${process.env.AZURE_STORAGE_CONTAINER_NAME}' created`);
    }
}

module.exports = { blobServiceClient, containerClient, initializeContainer };
```

## Building the Upload Functionality

Handle file uploads using Multer for parsing multipart form data and the Blob SDK for storing the file.

```javascript
// src/upload.js
const { containerClient } = require("./storage");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Upload a single file to Blob Storage
async function uploadFile(file, folder = "general") {
    // Generate a unique blob name to prevent collisions
    const extension = path.extname(file.originalname);
    const blobName = `${folder}/${uuidv4()}${extension}`;

    // Get a block blob client for the new blob
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the file buffer with content type
    await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
            blobContentType: file.mimetype
        },
        // Add metadata for later reference
        metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString()
        }
    });

    return {
        blobName,
        originalName: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        url: blockBlobClient.url
    };
}

// Upload a large file using streams (for files that do not fit in memory)
async function uploadLargeFile(readableStream, blobName, contentType, fileSize) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload with automatic chunking for large files
    await blockBlobClient.uploadStream(
        readableStream,
        4 * 1024 * 1024,  // 4 MB buffer size per chunk
        4,                  // 4 concurrent upload buffers
        {
            blobHTTPHeaders: {
                blobContentType: contentType
            }
        }
    );

    return {
        blobName,
        size: fileSize,
        url: blockBlobClient.url
    };
}

module.exports = { uploadFile, uploadLargeFile };
```

## Building the Download Functionality

Download files as streams or buffers.

```javascript
// src/download.js
const { containerClient } = require("./storage");

// Download a file as a buffer
async function downloadFile(blobName) {
    const blobClient = containerClient.getBlobClient(blobName);

    // Check if the blob exists
    const exists = await blobClient.exists();
    if (!exists) {
        throw new Error(`Blob not found: ${blobName}`);
    }

    // Download the blob content
    const downloadResponse = await blobClient.download();

    // Convert the readable stream to a buffer
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
    }

    return {
        buffer: Buffer.concat(chunks),
        contentType: downloadResponse.contentType,
        contentLength: downloadResponse.contentLength
    };
}

// Stream a file directly to the HTTP response (efficient for large files)
async function streamFile(blobName, res) {
    const blobClient = containerClient.getBlobClient(blobName);

    const exists = await blobClient.exists();
    if (!exists) {
        throw new Error(`Blob not found: ${blobName}`);
    }

    const downloadResponse = await blobClient.download();

    // Set response headers
    res.setHeader("Content-Type", downloadResponse.contentType);
    res.setHeader("Content-Length", downloadResponse.contentLength);

    // Pipe the blob stream directly to the response
    downloadResponse.readableStreamBody.pipe(res);
}

module.exports = { downloadFile, streamFile };
```

## Listing and Deleting Files

```javascript
// src/manage.js
const { containerClient } = require("./storage");
const {
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential
} = require("@azure/storage-blob");

// List all blobs in a folder
async function listFiles(prefix = "") {
    const files = [];

    // List blobs with the given prefix
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        files.push({
            name: blob.name,
            size: blob.properties.contentLength,
            contentType: blob.properties.contentType,
            lastModified: blob.properties.lastModified,
            // Include metadata if available
            metadata: blob.metadata || {}
        });
    }

    return files;
}

// Delete a blob
async function deleteFile(blobName) {
    const blobClient = containerClient.getBlobClient(blobName);

    const exists = await blobClient.exists();
    if (!exists) {
        throw new Error(`Blob not found: ${blobName}`);
    }

    await blobClient.delete();
    return { deleted: true, blobName };
}

// Generate a temporary download URL using a SAS token
async function generateSasUrl(blobName, expiryMinutes = 60) {
    const blobClient = containerClient.getBlobClient(blobName);

    const exists = await blobClient.exists();
    if (!exists) {
        throw new Error(`Blob not found: ${blobName}`);
    }

    // Generate a SAS URL that expires after the specified time
    const sasUrl = await blobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse("r"),  // Read-only
        expiresOn: new Date(Date.now() + expiryMinutes * 60 * 1000)
    });

    return sasUrl;
}

module.exports = { listFiles, deleteFile, generateSasUrl };
```

## Building the Express API

Tie everything together with Express routes.

```javascript
// src/app.js
const express = require("express");
const multer = require("multer");
const { initializeContainer } = require("./storage");
const { uploadFile } = require("./upload");
const { downloadFile, streamFile } = require("./download");
const { listFiles, deleteFile, generateSasUrl } = require("./manage");

const app = express();

// Configure multer for in-memory storage (for small-medium files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024  // 50 MB limit
    }
});

// Upload a single file
app.post("/api/files/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }

        const folder = req.body.folder || "uploads";
        const result = await uploadFile(req.file, folder);

        res.status(201).json(result);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Upload multiple files
app.post("/api/files/upload-multiple", upload.array("files", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        const folder = req.body.folder || "uploads";
        const results = await Promise.all(
            req.files.map(file => uploadFile(file, folder))
        );

        res.status(201).json(results);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Download a file
app.get("/api/files/download", async (req, res) => {
    try {
        const { blob } = req.query;
        if (!blob) {
            return res.status(400).json({ error: "blob parameter is required" });
        }

        // Stream the file directly for efficiency
        await streamFile(blob, res);
    } catch (error) {
        if (error.message.includes("not found")) {
            return res.status(404).json({ error: error.message });
        }
        console.error("Download error:", error);
        res.status(500).json({ error: error.message });
    }
});

// List files in a folder
app.get("/api/files", async (req, res) => {
    try {
        const prefix = req.query.folder || "";
        const files = await listFiles(prefix);
        res.json({ count: files.length, files });
    } catch (error) {
        console.error("List error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a file
app.delete("/api/files", async (req, res) => {
    try {
        const { blob } = req.query;
        if (!blob) {
            return res.status(400).json({ error: "blob parameter is required" });
        }

        const result = await deleteFile(blob);
        res.json(result);
    } catch (error) {
        if (error.message.includes("not found")) {
            return res.status(404).json({ error: error.message });
        }
        console.error("Delete error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Generate a temporary download URL
app.get("/api/files/share", async (req, res) => {
    try {
        const { blob, expiry } = req.query;
        if (!blob) {
            return res.status(400).json({ error: "blob parameter is required" });
        }

        const expiryMinutes = parseInt(expiry) || 60;
        const url = await generateSasUrl(blob, expiryMinutes);
        res.json({ url, expiresIn: `${expiryMinutes} minutes` });
    } catch (error) {
        console.error("SAS error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize and start the server
async function start() {
    await initializeContainer();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`File service running on port ${PORT}`);
    });
}

start().catch(console.error);
```

## Testing the API

```bash
# Upload a file
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@photo.jpg" \
  -F "folder=images"

# List files
curl http://localhost:3000/api/files?folder=images

# Download a file
curl -o downloaded.jpg "http://localhost:3000/api/files/download?blob=images/abc-photo.jpg"

# Generate a temporary share URL
curl "http://localhost:3000/api/files/share?blob=images/abc-photo.jpg&expiry=120"

# Delete a file
curl -X DELETE "http://localhost:3000/api/files?blob=images/abc-photo.jpg"
```

## Handling Large File Uploads with Streams

For files larger than what fits comfortably in memory, use streaming uploads.

```javascript
const busboy = require("busboy");

// Streaming upload endpoint for large files
app.post("/api/files/upload-large", (req, res) => {
    const bb = busboy({ headers: req.headers });

    bb.on("file", async (fieldname, fileStream, info) => {
        const { filename, mimeType } = info;
        const blobName = `large-uploads/${Date.now()}-${filename}`;

        try {
            const result = await uploadLargeFile(
                fileStream, blobName, mimeType, 0
            );
            res.status(201).json(result);
        } catch (error) {
            console.error("Large upload error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    req.pipe(bb);
});
```

## Wrapping Up

The `@azure/storage-blob` SDK for Node.js makes file management with Azure Blob Storage straightforward. The promise-based API integrates naturally with Express middleware like Multer for handling uploads. Use in-memory buffers for small files and streams for large ones. Generate SAS tokens for temporary access instead of exposing your storage keys. And always set content types on your blobs so browsers handle them correctly when downloading. With these building blocks, you can build anything from a simple file upload service to a full document management system.
