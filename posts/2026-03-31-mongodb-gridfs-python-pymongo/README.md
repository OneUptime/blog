# How to Use GridFS with Python and PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, Python, PyMongo

Description: Learn how to upload, download, list, and delete files in MongoDB GridFS using Python and PyMongo, with practical examples for Flask web applications.

---

PyMongo provides two APIs for working with GridFS: the high-level `gridfs.GridFS` class for simple operations and the lower-level `gridfs.GridIn`/`GridOut` classes for more control. This guide covers the high-level `GridFS` API, along with a Flask integration example.

## Setup

```bash
pip install pymongo
```

```python
from pymongo import MongoClient
import gridfs

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]
fs = gridfs.GridFS(db, collection="uploads")
```

## Uploading a File

```python
# Upload from a file path
def upload_file(file_path: str, filename: str, **metadata) -> str:
    with open(file_path, "rb") as f:
        file_id = fs.put(
            f,
            filename=filename,
            content_type="application/pdf",
            **metadata
        )
    print(f"Uploaded: {filename} with ID: {file_id}")
    return str(file_id)

file_id = upload_file("./report.pdf", "report.pdf", owner="alice", department="hr")
```

## Uploading from Bytes

```python
def upload_bytes(data: bytes, filename: str, content_type: str) -> str:
    file_id = fs.put(
        data,
        filename=filename,
        content_type=content_type
    )
    return str(file_id)
```

## Downloading a File

```python
from bson import ObjectId

def download_to_file(file_id: str, output_path: str) -> None:
    grid_out = fs.get(ObjectId(file_id))
    with open(output_path, "wb") as f:
        f.write(grid_out.read())
    print(f"Downloaded: {grid_out.filename} ({grid_out.length} bytes)")

download_to_file("64abc123def456789abcdef0", "./output/report.pdf")
```

## Downloading to Memory

```python
def download_to_bytes(file_id: str) -> tuple[bytes, str]:
    grid_out = fs.get(ObjectId(file_id))
    return grid_out.read(), grid_out.content_type

data, content_type = download_to_bytes("64abc123def456789abcdef0")
```

## Listing Files

```python
def list_files(filter_query: dict = None) -> list:
    query = filter_query or {}
    results = []
    for grid_out in fs.find(query).sort("uploadDate", -1):
        results.append({
            "id": str(grid_out._id),
            "filename": grid_out.filename,
            "size": grid_out.length,
            "upload_date": grid_out.upload_date,
            "content_type": getattr(grid_out, "content_type", None)
        })
    return results

all_files = list_files()
hr_files = list_files({"owner": "alice"})
```

## Deleting a File

```python
def delete_file(file_id: str) -> None:
    fs.delete(ObjectId(file_id))
    print(f"Deleted: {file_id}")

delete_file("64abc123def456789abcdef0")
```

## Flask Integration

```python
from flask import Flask, request, jsonify, send_file
from pymongo import MongoClient
import gridfs
from bson import ObjectId
import io

app = Flask(__name__)
client = MongoClient("mongodb://localhost:27017")
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
        content_type=file.content_type
    )
    return jsonify({"id": str(file_id), "filename": file.filename})

@app.route("/files/<file_id>")
def download(file_id):
    try:
        grid_out = fs.get(ObjectId(file_id))
        return send_file(
            io.BytesIO(grid_out.read()),
            mimetype=grid_out.content_type,
            download_name=grid_out.filename,
            as_attachment=True
        )
    except gridfs.errors.NoFile:
        return jsonify({"error": "File not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)
```

## Checking if a File Exists

```python
def file_exists(filename: str) -> bool:
    return fs.exists({"filename": filename})

if file_exists("report.pdf"):
    print("File found")
```

## Summary

PyMongo's `gridfs.GridFS` class wraps the GridFS specification with a clean Python API. Use `fs.put()` to upload (accepting file handles, bytes, or strings), `fs.get()` to retrieve by ObjectId, and `fs.delete()` to remove a file and its chunks. For Flask applications, pipe `GridOut` data through `send_file` using `io.BytesIO` to serve files directly from MongoDB without writing to disk.
