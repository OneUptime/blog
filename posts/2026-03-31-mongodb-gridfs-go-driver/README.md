# How to Use GridFS with the MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, GridFS, File Storage, Golang

Description: Learn how to store and retrieve large files in MongoDB using GridFS with the official MongoDB Go Driver.

---

## What Is GridFS?

GridFS stores files larger than MongoDB's 16 MB BSON limit by splitting them into chunks. The Go Driver provides the `GridFSBucket` type in the `mongo` package for uploading, downloading, listing, and deleting files.

## Setup

```bash
go get go.mongodb.org/mongo-driver/v2/mongo
```

## Creating a GridFS Bucket

```go
package main

import (
    "context"
    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

client, _ := mongo.Connect(options.Client().ApplyURI("mongodb://localhost:27017"))
db := client.Database("myapp")

// Default bucket (prefix: "fs")
bucket := db.GridFSBucket()

// Custom bucket
customBucket := db.GridFSBucket(
    options.GridFSBucket().
        SetName("uploads").
        SetChunkSizeBytes(1024 * 1024), // 1 MB chunks
)
```

## Uploading a File

```go
import (
    "os"
    "go.mongodb.org/mongo-driver/v2/bson"
)

// Open file
file, err := os.Open("/tmp/report.pdf")
if err != nil {
    log.Fatal(err)
}
defer file.Close()

// Upload with metadata
uploadOpts := options.GridFSUpload().
    SetMetadata(bson.D{
        {Key: "contentType", Value: "application/pdf"},
        {Key: "uploadedBy", Value: "user-123"},
    })

fileID, err := bucket.UploadFromStream(context.TODO(), "report.pdf", file, uploadOpts)
if err != nil {
    log.Fatal(err)
}
fmt.Println("Uploaded file ID:", fileID)
```

## Downloading a File

```go
import (
    "os"
    "go.mongodb.org/mongo-driver/v2/bson"
)

// Download by ObjectID to a file
outFile, err := os.Create("/tmp/downloaded-report.pdf")
if err != nil {
    log.Fatal(err)
}
defer outFile.Close()

_, err = bucket.DownloadToStream(context.TODO(), fileID, outFile)
if err != nil {
    log.Fatal(err)
}
fmt.Println("Download complete")

// Download by filename (most recent revision)
outFile2, _ := os.Create("/tmp/report-copy.pdf")
defer outFile2.Close()
bucket.DownloadToStreamByName(context.TODO(), "report.pdf", outFile2)
```

## Streaming Download (for HTTP handlers)

```go
import "net/http"

func serveFile(w http.ResponseWriter, r *http.Request) {
    idStr := r.URL.Query().Get("id")
    objectID, err := bson.ObjectIDFromHex(idStr)
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/octet-stream")

    _, err = bucket.DownloadToStream(r.Context(), objectID, w)
    if err != nil {
        http.Error(w, "File not found", http.StatusNotFound)
    }
}
```

## Listing Files

```go
cursor, err := bucket.Find(context.TODO(), bson.D{})
if err != nil {
    log.Fatal(err)
}
defer cursor.Close(context.Background())

for cursor.Next(context.Background()) {
    var fileInfo mongo.GridFSFile
    if err := cursor.Decode(&fileInfo); err != nil {
        log.Println(err)
        continue
    }
    fmt.Printf("Name: %s, Size: %d, Uploaded: %s\n",
        fileInfo.Name, fileInfo.Length, fileInfo.UploadDate)
}
```

## Filtering Files by Metadata

```go
cursor, err := bucket.Find(context.TODO(), bson.D{
    {Key: "metadata.uploadedBy", Value: "user-123"},
})
```

## Deleting a File

```go
err = bucket.Delete(context.TODO(), fileID)
if err != nil {
    log.Fatal(err)
}
fmt.Println("File deleted")
```

## Renaming a File

```go
err = bucket.Rename(context.TODO(), fileID, "report-v2.pdf")
```

## Drop the Bucket

```go
err = bucket.Drop(context.TODO())
```

Drops all files and chunks in the bucket.

## Summary

GridFS in the MongoDB Go Driver is accessed through `*mongo.GridFSBucket`. Create buckets with `db.GridFSBucket()`, upload files with `UploadFromStream()`, download with `DownloadToStream()` or stream directly to an `http.ResponseWriter`. List files with `bucket.Find()` and filter by metadata fields. Always handle errors from `UploadFromStream` and `DownloadToStream` and close streams with `defer`.
