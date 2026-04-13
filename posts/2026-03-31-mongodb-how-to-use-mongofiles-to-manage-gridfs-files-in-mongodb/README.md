# How to Use mongofiles to Manage GridFS Files in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, Mongofiles, File Storage

Description: Learn how to use the mongofiles command-line tool to store, retrieve, list, and delete files in MongoDB GridFS, including practical use cases and options.

---

## Overview

MongoDB GridFS is a specification for storing files larger than the 16MB BSON document size limit. GridFS splits files into chunks and stores them across two collections: `fs.files` (metadata) and `fs.chunks` (binary data). The `mongofiles` command-line tool provides a simple interface for interacting with GridFS directly from the terminal.

## Installation

`mongofiles` is part of MongoDB Database Tools:

```bash
# Verify installation
mongofiles --version

# Install on Ubuntu/Debian
sudo apt-get install mongodb-database-tools
```

## Available Commands

| Command | Description |
|---------|-------------|
| `put` | Upload a file to GridFS |
| `get` | Download a file from GridFS |
| `get_id` | Download a file by ObjectId |
| `delete` | Delete a file from GridFS by filename |
| `delete_id` | Delete a file from GridFS by ObjectId |
| `list` | List files in GridFS |
| `search` | Search for files by filename pattern |

## Uploading Files to GridFS

```bash
# Upload a file
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   put /path/to/document.pdf

# Upload with a custom filename in GridFS
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --local /path/to/document.pdf   put "reports/2026-q1-report.pdf"
```

## Listing Files in GridFS

```bash
# List all files
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   list

# Output example:
# 2026-q1-report.pdf    1048576
# profile.jpg           204800
# data-export.csv       51200

# Search for files containing a substring
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   search "reports/"
```

## Downloading Files from GridFS

```bash
# Download a file by name (saves to current directory)
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   get "2026-q1-report.pdf"

# Download to a specific path
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --local /tmp/downloaded-report.pdf   get "2026-q1-report.pdf"

# Download by ObjectId
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   get_id '{"$oid": "65f1234567890abcdef012345"}'
```

## Deleting Files from GridFS

```bash
# Delete by filename
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   delete "old-report.pdf"

# Delete by ObjectId
mongofiles   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   delete_id '{"$oid": "65f1234567890abcdef012345"}'
```

## Working with Custom Chunk Size

The default GridFS chunk size is 255KB. To use a different chunk size, configure it through the GridFSBucket API in your application driver rather than the `mongofiles` CLI:

```javascript
// Node.js example: upload with a 1MB chunk size
const bucket = new GridFSBucket(db, { chunkSizeBytes: 1048576 });
const uploadStream = bucket.openUploadStream('large-video.mp4');
fs.createReadStream('/path/to/large-video.mp4').pipe(uploadStream);
```

## Querying GridFS Metadata in mongosh

The files metadata is stored in `fs.files` and can be queried directly:

```javascript
// List all files with metadata
use mydb
db["fs.files"].find({}, { filename: 1, length: 1, uploadDate: 1, contentType: 1 })

// Find files larger than 1MB
db["fs.files"].find({ length: { $gt: 1048576 } })

// Find recently uploaded files
db["fs.files"].find({ uploadDate: { $gte: new Date("2026-03-01") } })

// Add custom metadata to a file
db["fs.files"].updateOne(
  { filename: "2026-q1-report.pdf" },
  { $set: { metadata: { department: "finance", year: 2026, quarter: 1 } } }
)

// Query by custom metadata
db["fs.files"].find({ "metadata.department": "finance" })
```

## Streaming Large Files

For large files, streaming is more memory-efficient than full download:

```javascript
// In an application (Node.js example)
const { MongoClient, GridFSBucket } = require('mongodb');

async function streamFile(filename, outputPath) {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('mydb');
  const bucket = new GridFSBucket(db);
  
  const fs = require('fs');
  const downloadStream = bucket.openDownloadStreamByName(filename);
  const writeStream = fs.createWriteStream(outputPath);
  
  await new Promise((resolve, reject) => {
    downloadStream.pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
  
  await client.close();
  console.log('Downloaded:', filename, '->', outputPath);
}

streamFile('2026-q1-report.pdf', '/tmp/report.pdf');
```

## Backup and Restore GridFS

```bash
# Include GridFS collections in mongodump
mongodump   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection fs.files   --out /backup/gridfs/

mongodump   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection fs.chunks   --out /backup/gridfs/

# Restore
mongorestore   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   /backup/gridfs/mydb/
```

## Summary

`mongofiles` provides a convenient command-line interface for MongoDB GridFS operations including upload (`put`), download (`get`/`get_id`), listing, and deletion. For files larger than 16MB, GridFS automatically splits data into chunks stored in `fs.chunks`, with metadata in `fs.files`. You can query the `fs.files` collection directly in mongosh to add custom metadata and build powerful file search capabilities. For application integration, use the GridFSBucket API in your MongoDB driver for streaming large files efficiently.
