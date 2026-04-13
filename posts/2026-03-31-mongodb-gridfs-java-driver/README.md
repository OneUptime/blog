# How to Use GridFS with the MongoDB Java Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, GridFS, File Storage, Driver

Description: Learn how to store, retrieve, and manage large files in MongoDB using GridFS with the official MongoDB Java Driver.

---

## What Is GridFS?

GridFS is a MongoDB specification for storing files that exceed the 16 MB BSON document size limit. It splits files into chunks (default 255 KB each) and stores them in two collections: `fs.files` (metadata) and `fs.chunks` (binary data). GridFS is ideal for storing images, videos, PDFs, and other binary assets directly alongside your application data.

## Maven Dependency

```xml
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
    <version>5.1.0</version>
</dependency>
```

## Creating a GridFSBucket

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.gridfs.GridFSBucket;
import com.mongodb.client.gridfs.GridFSBuckets;

MongoClient client = MongoClients.create("mongodb://localhost:27017");
MongoDatabase database = client.getDatabase("myapp");

// Default bucket (uses "fs" prefix)
GridFSBucket gridFSBucket = GridFSBuckets.create(database);

// Custom bucket name
GridFSBucket customBucket = GridFSBuckets.create(database, "uploads");
```

## Uploading a File

Upload from an `InputStream` - works with files, HTTP request bodies, or any stream:

```java
import com.mongodb.client.gridfs.model.GridFSUploadOptions;
import org.bson.Document;
import org.bson.types.ObjectId;
import java.io.FileInputStream;
import java.io.InputStream;

GridFSUploadOptions options = new GridFSUploadOptions()
    .chunkSizeBytes(1024 * 1024) // 1 MB chunks
    .metadata(new Document("contentType", "application/pdf")
        .append("uploadedBy", "user123"));

try (InputStream stream = new FileInputStream("/tmp/report.pdf")) {
    ObjectId fileId = gridFSBucket.uploadFromStream("report.pdf", stream, options);
    System.out.println("Uploaded file ID: " + fileId);
}
```

## Downloading a File

Download to an `OutputStream` by file ID or filename:

```java
import java.io.FileOutputStream;
import java.io.OutputStream;

// Download by ObjectId
try (OutputStream out = new FileOutputStream("/tmp/downloaded.pdf")) {
    gridFSBucket.downloadToStream(fileId, out);
}

// Download by filename (latest revision)
try (OutputStream out = new FileOutputStream("/tmp/report-copy.pdf")) {
    gridFSBucket.downloadToStream("report.pdf", out);
}
```

## Listing Files

```java
import com.mongodb.client.gridfs.GridFSFindIterable;
import com.mongodb.client.gridfs.model.GridFSFile;
import com.mongodb.client.model.Filters;

// List all files
GridFSFindIterable files = gridFSBucket.find();
for (GridFSFile file : files) {
    System.out.printf("Name: %s, Size: %d bytes, Uploaded: %s%n",
        file.getFilename(),
        file.getLength(),
        file.getUploadDate());
}

// Filter by metadata
gridFSBucket.find(
    Filters.eq("metadata.uploadedBy", "user123")
).forEach(f -> System.out.println(f.getFilename()));
```

## Deleting a File

```java
gridFSBucket.delete(fileId);
```

This removes both the file metadata from `fs.files` and all associated chunks from `fs.chunks`.

## Opening a Download Stream

For streaming responses (e.g., in a web server), use `openDownloadStream` to get an `InputStream` directly:

```java
import com.mongodb.client.gridfs.GridFSDownloadStream;

try (GridFSDownloadStream downloadStream =
        gridFSBucket.openDownloadStream(fileId)) {
    GridFSFile fileInfo = downloadStream.getGridFSFile();
    System.out.println("Content type: " +
        fileInfo.getMetadata().getString("contentType"));

    byte[] buffer = new byte[4096];
    int bytesRead;
    while ((bytesRead = downloadStream.read(buffer)) != -1) {
        // write buffer to HTTP response output stream
    }
}
```

## Configuring Chunk Size

The default chunk size is 255 KB. Increase it for large sequential reads to reduce the number of chunks MongoDB must read:

```java
GridFSBucket largeBucket = GridFSBuckets.create(database, "videos")
    .withChunkSizeBytes(4 * 1024 * 1024); // 4 MB
```

## Summary

GridFS in the MongoDB Java Driver provides a straightforward API for storing and retrieving arbitrarily large files. Use `GridFSBuckets.create()` to get a bucket, `uploadFromStream()` to store files with optional metadata, and `downloadToStream()` or `openDownloadStream()` to retrieve them. Always close streams in try-with-resources blocks to avoid connection leaks, and index the `metadata` fields you query frequently for better performance.
