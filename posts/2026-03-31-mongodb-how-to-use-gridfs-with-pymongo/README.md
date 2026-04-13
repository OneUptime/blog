# How to Use GridFS with PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PyMongo, GridFS, File Storage, Python

Description: Learn how to store, retrieve, and manage large files in MongoDB using GridFS with PyMongo, including uploading from files and buffers and downloading to streams.

---

## Overview

GridFS is MongoDB's specification for storing files larger than 16 MB. PyMongo provides the `gridfs` module with a high-level `GridFS` class and the newer `GridIn`/`GridOut` API via `GridFSBucket`. Files are split into chunks stored in `fs.chunks` and metadata stored in `fs.files`.

## Installation

```bash
pip install pymongo
```

## Setting Up GridFS

```python
from pymongo import MongoClient
import gridfs

client = MongoClient("mongodb://localhost:27017/")
db = client["myapp"]

# High-level GridFS interface
fs = gridfs.GridFS(db)

# Or use GridFSBucket for more control
from gridfs import GridIn, GridOut
from gridfs.errors import GridFSError
```

## Uploading a File

### From a file path

```python
def upload_file(fs, file_path, filename=None, content_type=None, metadata=None):
    with open(file_path, "rb") as f:
        file_id = fs.put(
            f,
            filename=filename or file_path.split("/")[-1],
            content_type=content_type or "application/octet-stream",
            metadata=metadata or {}
        )
    return file_id

# Upload an image
file_id = upload_file(
    fs,
    "/tmp/photo.jpg",
    filename="profile-photo.jpg",
    content_type="image/jpeg",
    metadata={"userId": "u123", "purpose": "profile"}
)
print("Uploaded with ID:", file_id)
```

### From bytes/buffer

```python
def upload_bytes(fs, data, filename, content_type="application/octet-stream"):
    return fs.put(data, filename=filename, content_type=content_type)

# Upload a PDF from bytes
pdf_bytes = b"%PDF-1.4 ..."  # your PDF content
file_id = upload_bytes(fs, pdf_bytes, "report.pdf", "application/pdf")
```

## Checking if a File Exists

```python
if fs.exists({"filename": "profile-photo.jpg"}):
    print("File exists")

# Or by ID
from bson import ObjectId
if fs.exists(ObjectId("64a1234abc...")):
    print("File exists by ID")
```

## Downloading a File

### Read all bytes at once

```python
def download_file(fs, file_id):
    grid_out = fs.get(file_id)
    return grid_out.read()

# By filename (returns the newest version)
grid_out = fs.get_last_version(filename="profile-photo.jpg")
data = grid_out.read()
```

### Stream to a local file

```python
def download_to_path(fs, file_id, output_path):
    grid_out = fs.get(file_id)
    with open(output_path, "wb") as f:
        f.write(grid_out.read())
    print("Downloaded to", output_path)

download_to_path(fs, file_id, "/tmp/downloaded.jpg")
```

## Accessing File Metadata

```python
grid_out = fs.get(file_id)
print("Filename:", grid_out.filename)
print("Content type:", grid_out.content_type)
print("Length:", grid_out.length)
print("Upload date:", grid_out.upload_date)
print("Metadata:", grid_out.metadata)
```

## Listing Files

```python
# List all files
for grid_out in fs.find():
    print(grid_out.filename, grid_out.length, grid_out.upload_date)

# Filter by metadata
for grid_out in fs.find({"metadata.userId": "u123"}):
    print(grid_out.filename)
```

## Deleting a File

```python
def delete_file(fs, file_id):
    fs.delete(file_id)
    print("File deleted")

delete_file(fs, file_id)
```

## Flask API Example for File Upload and Download

```python
from flask import Flask, request, send_file, jsonify
from pymongo import MongoClient
import gridfs
from bson import ObjectId
from io import BytesIO

app = Flask(__name__)
client = MongoClient("mongodb://localhost:27017/")
db = client["myapp"]
fs = gridfs.GridFS(db)

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    file_id = fs.put(
        file.read(),
        filename=file.filename,
        content_type=file.content_type,
        metadata={"uploadedBy": request.form.get("userId")}
    )
    return jsonify({"fileId": str(file_id)}), 201

@app.route("/files/<file_id>", methods=["GET"])
def download(file_id):
    try:
        grid_out = fs.get(ObjectId(file_id))
        return send_file(
            BytesIO(grid_out.read()),
            mimetype=grid_out.content_type or "application/octet-stream",
            download_name=grid_out.filename
        )
    except gridfs.NoFile:
        return jsonify({"error": "File not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)
```

## Summary

PyMongo's `gridfs` module provides a simple interface for storing and retrieving large files in MongoDB. Use `fs.put()` for uploads, `fs.get()` for downloads, and `fs.find()` for listing. Always stream files rather than buffering them in memory for large files. The metadata field lets you associate files with users or application entities, making it easy to query and manage file ownership.
