# How to Handle File Uploads in Go at Scale

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, File Upload, AWS, S3, Performance, Streaming

Description: Handle large file uploads in Go efficiently with streaming, chunked uploads, S3 multipart uploads, and memory-efficient processing techniques.

---

Handling file uploads at scale is one of the most challenging aspects of building production-ready web applications. When your application needs to handle thousands of concurrent uploads, ranging from small images to multi-gigabyte videos, naive approaches quickly fall apart. Memory exhaustion, timeouts, and failed uploads become the norm.

In this comprehensive guide, we'll explore how to build a robust file upload system in Go that can handle files of any size efficiently. We'll cover streaming uploads, chunked/resumable uploads, S3 multipart integration, progress tracking, and essential security considerations.

## Table of Contents

1. [Understanding the Problem](#understanding-the-problem)
2. [Basic Multipart Form Handling](#basic-multipart-form-handling)
3. [Streaming Uploads to Avoid Memory Issues](#streaming-uploads-to-avoid-memory-issues)
4. [Chunked and Resumable Uploads](#chunked-and-resumable-uploads)
5. [S3 Multipart Upload Integration](#s3-multipart-upload-integration)
6. [Progress Tracking](#progress-tracking)
7. [Validation and Security](#validation-and-security)
8. [Putting It All Together](#putting-it-all-together)
9. [Conclusion](#conclusion)

## Understanding the Problem

Before diving into solutions, let's understand why file uploads at scale are challenging:

- **Memory consumption**: Loading entire files into memory doesn't scale. A server handling 100 concurrent uploads of 100MB files would need 10GB of RAM.
- **Network reliability**: Large uploads over unreliable connections often fail. Users shouldn't have to restart from scratch.
- **Storage backends**: Writing directly to cloud storage (like S3) requires different patterns than local disk.
- **User experience**: Users expect feedback on upload progress and the ability to resume failed uploads.

## Basic Multipart Form Handling

Let's start with the basics. Go's standard library provides excellent support for handling multipart form uploads.

The following code shows a basic HTTP handler that receives a multipart file upload and saves it to disk:

```go
package main

import (
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
)

// BasicUploadHandler demonstrates the simplest form of file upload handling.
// WARNING: This approach loads files into memory and is NOT suitable for large files.
func BasicUploadHandler(w http.ResponseWriter, r *http.Request) {
    // Limit the request body size to prevent abuse
    // This returns an error if the client sends more than 32MB
    r.Body = http.MaxBytesReader(w, r.Body, 32<<20) // 32MB limit

    // Parse the multipart form with a 32MB max memory limit
    // Files larger than this are stored in temporary files
    if err := r.ParseMultipartForm(32 << 20); err != nil {
        http.Error(w, "File too large", http.StatusBadRequest)
        return
    }

    // Retrieve the file from the form data
    file, header, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "Error retrieving file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    // Create the destination file
    dst, err := os.Create(filepath.Join("uploads", header.Filename))
    if err != nil {
        http.Error(w, "Error saving file", http.StatusInternalServerError)
        return
    }
    defer dst.Close()

    // Copy the uploaded file to the destination
    if _, err := io.Copy(dst, file); err != nil {
        http.Error(w, "Error saving file", http.StatusInternalServerError)
        return
    }

    fmt.Fprintf(w, "File %s uploaded successfully", header.Filename)
}
```

This approach works for small files but has significant limitations:

- `ParseMultipartForm` buffers the file in memory (up to the specified limit)
- Large files are stored in temporary files, adding I/O overhead
- No progress tracking or resume capability
- No streaming to remote storage

## Streaming Uploads to Avoid Memory Issues

For large files, we need to process the upload as a stream without buffering the entire file in memory.

This implementation uses `multipart.Reader` to process uploads as a stream, never loading the entire file into memory:

```go
package main

import (
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
    "path/filepath"
)

const (
    // MaxUploadSize is the maximum allowed file size (1GB)
    MaxUploadSize = 1 << 30
    // BufferSize is the size of the buffer used for streaming (64KB)
    BufferSize = 64 * 1024
)

// StreamingUploadHandler processes file uploads as a stream,
// minimizing memory usage regardless of file size.
func StreamingUploadHandler(w http.ResponseWriter, r *http.Request) {
    // Limit request body size
    r.Body = http.MaxBytesReader(w, r.Body, MaxUploadSize)

    // Get the Content-Type header to extract the boundary
    contentType := r.Header.Get("Content-Type")
    if contentType == "" {
        http.Error(w, "Content-Type header required", http.StatusBadRequest)
        return
    }

    // Create a multipart reader directly from the request body
    // This avoids buffering the entire request in memory
    reader, err := r.MultipartReader()
    if err != nil {
        http.Error(w, "Error creating multipart reader", http.StatusBadRequest)
        return
    }

    // Process each part of the multipart request
    for {
        part, err := reader.NextPart()
        if err == io.EOF {
            break // No more parts
        }
        if err != nil {
            http.Error(w, "Error reading part", http.StatusBadRequest)
            return
        }

        // Skip non-file parts (e.g., form fields)
        if part.FileName() == "" {
            continue
        }

        // Process the file part
        if err := processFilePart(part); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
    }

    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, "Upload complete")
}

// processFilePart handles a single file part from the multipart stream.
// It streams the file directly to disk while computing a checksum.
func processFilePart(part *multipart.Part) error {
    // Sanitize the filename to prevent directory traversal attacks
    filename := filepath.Base(part.FileName())
    if filename == "." || filename == "/" {
        return fmt.Errorf("invalid filename")
    }

    // Create the destination file
    dst, err := os.Create(filepath.Join("uploads", filename))
    if err != nil {
        return fmt.Errorf("error creating file: %w", err)
    }
    defer dst.Close()

    // Create a hash writer to compute checksum while streaming
    hash := sha256.New()

    // Use a multi-writer to write to both file and hash simultaneously
    multiWriter := io.MultiWriter(dst, hash)

    // Stream the file using a fixed-size buffer
    // This ensures constant memory usage regardless of file size
    buf := make([]byte, BufferSize)
    written, err := io.CopyBuffer(multiWriter, part, buf)
    if err != nil {
        return fmt.Errorf("error writing file: %w", err)
    }

    // Compute the final checksum
    checksum := hex.EncodeToString(hash.Sum(nil))

    fmt.Printf("File %s uploaded: %d bytes, checksum: %s\n",
        filename, written, checksum)

    return nil
}
```

### Key Benefits of Streaming

1. **Constant memory usage**: Only the buffer size (64KB) is used, regardless of file size
2. **Simultaneous processing**: We compute checksums while writing, without extra passes
3. **Early termination**: We can stop processing immediately if validation fails

## Chunked and Resumable Uploads

For truly large files or unreliable networks, chunked uploads allow clients to upload files in pieces and resume from where they left off.

First, let's define the data structures for managing chunked uploads:

```go
package main

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "sync"
    "time"
)

// ChunkedUpload represents the state of an in-progress chunked upload.
type ChunkedUpload struct {
    ID            string    `json:"id"`
    Filename      string    `json:"filename"`
    TotalSize     int64     `json:"total_size"`
    ChunkSize     int64     `json:"chunk_size"`
    TotalChunks   int       `json:"total_chunks"`
    UploadedChunks map[int]bool `json:"uploaded_chunks"`
    CreatedAt     time.Time `json:"created_at"`
    ExpiresAt     time.Time `json:"expires_at"`
}

// ChunkedUploadManager handles the lifecycle of chunked uploads.
type ChunkedUploadManager struct {
    uploads    map[string]*ChunkedUpload
    uploadDir  string
    mu         sync.RWMutex
}

// NewChunkedUploadManager creates a new manager for chunked uploads.
func NewChunkedUploadManager(uploadDir string) *ChunkedUploadManager {
    return &ChunkedUploadManager{
        uploads:   make(map[string]*ChunkedUpload),
        uploadDir: uploadDir,
    }
}
```

Next, we implement the endpoint to initiate a new chunked upload session:

```go
// InitiateUpload creates a new chunked upload session.
// Clients call this first to get an upload ID and chunk requirements.
func (m *ChunkedUploadManager) InitiateUpload(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Filename  string `json:"filename"`
        TotalSize int64  `json:"total_size"`
        ChunkSize int64  `json:"chunk_size"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Validate the request
    if req.TotalSize <= 0 || req.ChunkSize <= 0 {
        http.Error(w, "Invalid size parameters", http.StatusBadRequest)
        return
    }

    // Calculate total number of chunks
    totalChunks := int((req.TotalSize + req.ChunkSize - 1) / req.ChunkSize)

    // Generate a unique upload ID
    uploadID := generateUploadID()

    // Create the upload session
    upload := &ChunkedUpload{
        ID:             uploadID,
        Filename:       filepath.Base(req.Filename),
        TotalSize:      req.TotalSize,
        ChunkSize:      req.ChunkSize,
        TotalChunks:    totalChunks,
        UploadedChunks: make(map[int]bool),
        CreatedAt:      time.Now(),
        ExpiresAt:      time.Now().Add(24 * time.Hour),
    }

    // Create the temporary directory for this upload
    uploadPath := filepath.Join(m.uploadDir, "chunks", uploadID)
    if err := os.MkdirAll(uploadPath, 0755); err != nil {
        http.Error(w, "Error creating upload directory", http.StatusInternalServerError)
        return
    }

    // Store the upload session
    m.mu.Lock()
    m.uploads[uploadID] = upload
    m.mu.Unlock()

    // Return the upload session details
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(upload)
}

// generateUploadID creates a unique identifier for an upload session.
func generateUploadID() string {
    data := make([]byte, 16)
    // In production, use crypto/rand
    hash := sha256.Sum256(append(data, []byte(time.Now().String())...))
    return hex.EncodeToString(hash[:16])
}
```

Now we implement the handler for uploading individual chunks:

```go
// UploadChunk handles the upload of a single chunk.
// Chunks can be uploaded in any order and retried if they fail.
func (m *ChunkedUploadManager) UploadChunk(w http.ResponseWriter, r *http.Request) {
    // Extract upload ID and chunk number from the URL or headers
    uploadID := r.URL.Query().Get("upload_id")
    chunkNumber := 0
    fmt.Sscanf(r.URL.Query().Get("chunk"), "%d", &chunkNumber)

    // Retrieve the upload session
    m.mu.RLock()
    upload, exists := m.uploads[uploadID]
    m.mu.RUnlock()

    if !exists {
        http.Error(w, "Upload session not found", http.StatusNotFound)
        return
    }

    // Validate chunk number
    if chunkNumber < 0 || chunkNumber >= upload.TotalChunks {
        http.Error(w, "Invalid chunk number", http.StatusBadRequest)
        return
    }

    // Check if chunk was already uploaded
    m.mu.RLock()
    alreadyUploaded := upload.UploadedChunks[chunkNumber]
    m.mu.RUnlock()

    if alreadyUploaded {
        w.WriteHeader(http.StatusOK)
        fmt.Fprint(w, "Chunk already uploaded")
        return
    }

    // Create the chunk file
    chunkPath := filepath.Join(m.uploadDir, "chunks", uploadID,
        fmt.Sprintf("chunk_%d", chunkNumber))

    chunkFile, err := os.Create(chunkPath)
    if err != nil {
        http.Error(w, "Error creating chunk file", http.StatusInternalServerError)
        return
    }
    defer chunkFile.Close()

    // Stream the chunk data to the file
    written, err := io.Copy(chunkFile, r.Body)
    if err != nil {
        os.Remove(chunkPath) // Clean up on error
        http.Error(w, "Error writing chunk", http.StatusInternalServerError)
        return
    }

    // Validate chunk size (except for the last chunk)
    expectedSize := upload.ChunkSize
    if chunkNumber == upload.TotalChunks-1 {
        // Last chunk may be smaller
        expectedSize = upload.TotalSize - (int64(chunkNumber) * upload.ChunkSize)
    }

    if written != expectedSize {
        os.Remove(chunkPath)
        http.Error(w, "Chunk size mismatch", http.StatusBadRequest)
        return
    }

    // Mark chunk as uploaded
    m.mu.Lock()
    upload.UploadedChunks[chunkNumber] = true
    m.mu.Unlock()

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "chunk":    chunkNumber,
        "uploaded": len(upload.UploadedChunks),
        "total":    upload.TotalChunks,
    })
}
```

Finally, we implement the endpoint to complete the upload and reassemble the file:

```go
// CompleteUpload assembles all chunks into the final file.
// This should be called after all chunks have been uploaded.
func (m *ChunkedUploadManager) CompleteUpload(w http.ResponseWriter, r *http.Request) {
    uploadID := r.URL.Query().Get("upload_id")

    m.mu.RLock()
    upload, exists := m.uploads[uploadID]
    m.mu.RUnlock()

    if !exists {
        http.Error(w, "Upload session not found", http.StatusNotFound)
        return
    }

    // Verify all chunks are uploaded
    if len(upload.UploadedChunks) != upload.TotalChunks {
        http.Error(w, fmt.Sprintf("Missing chunks: %d/%d uploaded",
            len(upload.UploadedChunks), upload.TotalChunks), http.StatusBadRequest)
        return
    }

    // Create the final file
    finalPath := filepath.Join(m.uploadDir, upload.Filename)
    finalFile, err := os.Create(finalPath)
    if err != nil {
        http.Error(w, "Error creating final file", http.StatusInternalServerError)
        return
    }
    defer finalFile.Close()

    // Assemble chunks in order
    chunksDir := filepath.Join(m.uploadDir, "chunks", uploadID)
    for i := 0; i < upload.TotalChunks; i++ {
        chunkPath := filepath.Join(chunksDir, fmt.Sprintf("chunk_%d", i))

        chunkFile, err := os.Open(chunkPath)
        if err != nil {
            http.Error(w, "Error reading chunk", http.StatusInternalServerError)
            return
        }

        if _, err := io.Copy(finalFile, chunkFile); err != nil {
            chunkFile.Close()
            http.Error(w, "Error assembling file", http.StatusInternalServerError)
            return
        }
        chunkFile.Close()
    }

    // Clean up chunk files
    os.RemoveAll(chunksDir)

    // Remove the upload session
    m.mu.Lock()
    delete(m.uploads, uploadID)
    m.mu.Unlock()

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "filename": upload.Filename,
        "size":     upload.TotalSize,
        "status":   "complete",
    })
}

// GetUploadStatus returns the current state of a chunked upload.
// Clients use this to determine which chunks need to be uploaded after a failure.
func (m *ChunkedUploadManager) GetUploadStatus(w http.ResponseWriter, r *http.Request) {
    uploadID := r.URL.Query().Get("upload_id")

    m.mu.RLock()
    upload, exists := m.uploads[uploadID]
    m.mu.RUnlock()

    if !exists {
        http.Error(w, "Upload session not found", http.StatusNotFound)
        return
    }

    // Calculate missing chunks
    missingChunks := make([]int, 0)
    for i := 0; i < upload.TotalChunks; i++ {
        if !upload.UploadedChunks[i] {
            missingChunks = append(missingChunks, i)
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "upload_id":       upload.ID,
        "filename":        upload.Filename,
        "uploaded_chunks": len(upload.UploadedChunks),
        "total_chunks":    upload.TotalChunks,
        "missing_chunks":  missingChunks,
        "expires_at":      upload.ExpiresAt,
    })
}
```

## S3 Multipart Upload Integration

When storing files in S3, we can leverage S3's native multipart upload feature for optimal performance and reliability.

First, let's set up the S3 client and define our uploader structure:

```go
package main

import (
    "context"
    "fmt"
    "io"
    "sync"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const (
    // S3PartSize is the size of each part in bytes (5MB minimum for S3)
    S3PartSize = 5 * 1024 * 1024
    // MaxConcurrentParts is the number of parts to upload concurrently
    MaxConcurrentParts = 5
)

// S3MultipartUploader handles streaming uploads to S3.
type S3MultipartUploader struct {
    client *s3.Client
    bucket string
}

// NewS3MultipartUploader creates a new S3 uploader.
func NewS3MultipartUploader(bucket string) (*S3MultipartUploader, error) {
    cfg, err := config.LoadDefaultConfig(context.Background())
    if err != nil {
        return nil, fmt.Errorf("error loading AWS config: %w", err)
    }

    return &S3MultipartUploader{
        client: s3.NewFromConfig(cfg),
        bucket: bucket,
    }, nil
}
```

Now we implement the main upload method that streams data directly to S3:

```go
// UploadStream streams data from a reader directly to S3 using multipart upload.
// This is memory-efficient as it only buffers one part at a time.
func (u *S3MultipartUploader) UploadStream(
    ctx context.Context,
    key string,
    reader io.Reader,
    contentType string,
) (*s3.CompleteMultipartUploadOutput, error) {

    // Step 1: Initiate the multipart upload
    createResp, err := u.client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
        Bucket:      aws.String(u.bucket),
        Key:         aws.String(key),
        ContentType: aws.String(contentType),
    })
    if err != nil {
        return nil, fmt.Errorf("error initiating multipart upload: %w", err)
    }

    uploadID := createResp.UploadId
    var completedParts []types.CompletedPart
    partNumber := int32(1)

    // Ensure cleanup on error
    defer func() {
        if err != nil {
            u.client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
                Bucket:   aws.String(u.bucket),
                Key:      aws.String(key),
                UploadId: uploadID,
            })
        }
    }()

    // Step 2: Upload parts
    buf := make([]byte, S3PartSize)

    for {
        // Read a full part from the reader
        n, readErr := io.ReadFull(reader, buf)

        if n > 0 {
            // Upload this part
            uploadResp, uploadErr := u.client.UploadPart(ctx, &s3.UploadPartInput{
                Bucket:     aws.String(u.bucket),
                Key:        aws.String(key),
                PartNumber: aws.Int32(partNumber),
                UploadId:   uploadID,
                Body:       &readSeeker{data: buf[:n]},
            })
            if uploadErr != nil {
                err = fmt.Errorf("error uploading part %d: %w", partNumber, uploadErr)
                return nil, err
            }

            completedParts = append(completedParts, types.CompletedPart{
                ETag:       uploadResp.ETag,
                PartNumber: aws.Int32(partNumber),
            })
            partNumber++
        }

        if readErr == io.EOF || readErr == io.ErrUnexpectedEOF {
            break // End of data
        }
        if readErr != nil {
            err = fmt.Errorf("error reading data: %w", readErr)
            return nil, err
        }
    }

    // Step 3: Complete the multipart upload
    completeResp, err := u.client.CompleteMultipartUpload(ctx,
        &s3.CompleteMultipartUploadInput{
            Bucket:   aws.String(u.bucket),
            Key:      aws.String(key),
            UploadId: uploadID,
            MultipartUpload: &types.CompletedMultipartUpload{
                Parts: completedParts,
            },
        })
    if err != nil {
        return nil, fmt.Errorf("error completing multipart upload: %w", err)
    }

    return completeResp, nil
}

// readSeeker wraps a byte slice to satisfy io.ReadSeeker for S3 SDK.
type readSeeker struct {
    data   []byte
    offset int64
}

func (r *readSeeker) Read(p []byte) (n int, err error) {
    if r.offset >= int64(len(r.data)) {
        return 0, io.EOF
    }
    n = copy(p, r.data[r.offset:])
    r.offset += int64(n)
    return n, nil
}

func (r *readSeeker) Seek(offset int64, whence int) (int64, error) {
    switch whence {
    case io.SeekStart:
        r.offset = offset
    case io.SeekCurrent:
        r.offset += offset
    case io.SeekEnd:
        r.offset = int64(len(r.data)) + offset
    }
    return r.offset, nil
}
```

For better performance with large files, we can upload parts concurrently:

```go
// UploadStreamConcurrent uploads parts to S3 concurrently for improved throughput.
// It maintains order while uploading multiple parts in parallel.
func (u *S3MultipartUploader) UploadStreamConcurrent(
    ctx context.Context,
    key string,
    reader io.Reader,
    contentType string,
) (*s3.CompleteMultipartUploadOutput, error) {

    // Initiate the multipart upload
    createResp, err := u.client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
        Bucket:      aws.String(u.bucket),
        Key:         aws.String(key),
        ContentType: aws.String(contentType),
    })
    if err != nil {
        return nil, fmt.Errorf("error initiating multipart upload: %w", err)
    }

    uploadID := createResp.UploadId

    // Channel for collecting completed parts
    type partResult struct {
        partNumber int32
        etag       *string
        err        error
    }

    results := make(chan partResult, MaxConcurrentParts)
    var wg sync.WaitGroup
    semaphore := make(chan struct{}, MaxConcurrentParts)

    partNumber := int32(1)
    var readErr error

    // Read and upload parts
    for readErr == nil {
        buf := make([]byte, S3PartSize)
        n, err := io.ReadFull(reader, buf)
        readErr = err

        if n > 0 {
            wg.Add(1)
            semaphore <- struct{}{} // Acquire semaphore

            go func(pn int32, data []byte) {
                defer wg.Done()
                defer func() { <-semaphore }() // Release semaphore

                resp, err := u.client.UploadPart(ctx, &s3.UploadPartInput{
                    Bucket:     aws.String(u.bucket),
                    Key:        aws.String(key),
                    PartNumber: aws.Int32(pn),
                    UploadId:   uploadID,
                    Body:       &readSeeker{data: data},
                })

                if err != nil {
                    results <- partResult{partNumber: pn, err: err}
                    return
                }
                results <- partResult{partNumber: pn, etag: resp.ETag}
            }(partNumber, buf[:n])

            partNumber++
        }
    }

    // Close results channel after all uploads complete
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    partsMap := make(map[int32]*string)
    for result := range results {
        if result.err != nil {
            // Abort on any error
            u.client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
                Bucket:   aws.String(u.bucket),
                Key:      aws.String(key),
                UploadId: uploadID,
            })
            return nil, result.err
        }
        partsMap[result.partNumber] = result.etag
    }

    // Build ordered parts list
    completedParts := make([]types.CompletedPart, 0, len(partsMap))
    for i := int32(1); i < partNumber; i++ {
        completedParts = append(completedParts, types.CompletedPart{
            ETag:       partsMap[i],
            PartNumber: aws.Int32(i),
        })
    }

    // Complete the multipart upload
    return u.client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
        Bucket:   aws.String(u.bucket),
        Key:      aws.String(key),
        UploadId: uploadID,
        MultipartUpload: &types.CompletedMultipartUpload{
            Parts: completedParts,
        },
    })
}
```

## Progress Tracking

Users expect feedback during uploads. Let's implement progress tracking that works with both streaming and chunked uploads.

First, we define a progress tracking reader that wraps the input stream:

```go
package main

import (
    "io"
    "sync"
    "time"
)

// ProgressCallback is called with upload progress updates.
type ProgressCallback func(bytesRead, totalBytes int64, percentage float64)

// ProgressReader wraps an io.Reader to track read progress.
type ProgressReader struct {
    reader     io.Reader
    totalBytes int64
    bytesRead  int64
    callback   ProgressCallback
    mu         sync.Mutex
    lastUpdate time.Time
    minInterval time.Duration
}

// NewProgressReader creates a new progress-tracking reader.
// The callback is invoked periodically (not for every read) to avoid overhead.
func NewProgressReader(
    reader io.Reader,
    totalBytes int64,
    callback ProgressCallback,
) *ProgressReader {
    return &ProgressReader{
        reader:      reader,
        totalBytes:  totalBytes,
        callback:    callback,
        minInterval: 100 * time.Millisecond, // Update at most every 100ms
    }
}

// Read implements io.Reader with progress tracking.
func (pr *ProgressReader) Read(p []byte) (n int, err error) {
    n, err = pr.reader.Read(p)
    if n > 0 {
        pr.mu.Lock()
        pr.bytesRead += int64(n)

        // Only call callback if enough time has passed
        now := time.Now()
        if now.Sub(pr.lastUpdate) >= pr.minInterval {
            pr.lastUpdate = now
            bytesRead := pr.bytesRead
            pr.mu.Unlock()

            percentage := float64(bytesRead) / float64(pr.totalBytes) * 100
            pr.callback(bytesRead, pr.totalBytes, percentage)
        } else {
            pr.mu.Unlock()
        }
    }
    return n, err
}

// BytesRead returns the current number of bytes read.
func (pr *ProgressReader) BytesRead() int64 {
    pr.mu.Lock()
    defer pr.mu.Unlock()
    return pr.bytesRead
}
```

Now let's implement Server-Sent Events (SSE) for real-time progress updates to web clients:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "sync"
    "time"
)

// ProgressTracker manages progress updates for multiple uploads.
type ProgressTracker struct {
    uploads map[string]*UploadProgress
    mu      sync.RWMutex
}

// UploadProgress represents the progress of a single upload.
type UploadProgress struct {
    UploadID    string    `json:"upload_id"`
    Filename    string    `json:"filename"`
    BytesRead   int64     `json:"bytes_read"`
    TotalBytes  int64     `json:"total_bytes"`
    Percentage  float64   `json:"percentage"`
    Status      string    `json:"status"`
    StartedAt   time.Time `json:"started_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    subscribers []chan *UploadProgress
    mu          sync.Mutex
}

// NewProgressTracker creates a new progress tracker.
func NewProgressTracker() *ProgressTracker {
    return &ProgressTracker{
        uploads: make(map[string]*UploadProgress),
    }
}

// StartTracking begins tracking a new upload.
func (pt *ProgressTracker) StartTracking(uploadID, filename string, totalBytes int64) *UploadProgress {
    progress := &UploadProgress{
        UploadID:   uploadID,
        Filename:   filename,
        TotalBytes: totalBytes,
        Status:     "in_progress",
        StartedAt:  time.Now(),
        UpdatedAt:  time.Now(),
    }

    pt.mu.Lock()
    pt.uploads[uploadID] = progress
    pt.mu.Unlock()

    return progress
}

// Update updates the progress of an upload and notifies subscribers.
func (up *UploadProgress) Update(bytesRead int64) {
    up.mu.Lock()
    up.BytesRead = bytesRead
    up.Percentage = float64(bytesRead) / float64(up.TotalBytes) * 100
    up.UpdatedAt = time.Now()

    // Copy subscribers to avoid holding lock while sending
    subs := make([]chan *UploadProgress, len(up.subscribers))
    copy(subs, up.subscribers)
    up.mu.Unlock()

    // Notify all subscribers
    for _, sub := range subs {
        select {
        case sub <- up:
        default:
            // Don't block if subscriber is slow
        }
    }
}

// Subscribe adds a subscriber for progress updates.
func (up *UploadProgress) Subscribe() chan *UploadProgress {
    ch := make(chan *UploadProgress, 10)
    up.mu.Lock()
    up.subscribers = append(up.subscribers, ch)
    up.mu.Unlock()
    return ch
}

// Unsubscribe removes a subscriber.
func (up *UploadProgress) Unsubscribe(ch chan *UploadProgress) {
    up.mu.Lock()
    defer up.mu.Unlock()

    for i, sub := range up.subscribers {
        if sub == ch {
            up.subscribers = append(up.subscribers[:i], up.subscribers[i+1:]...)
            close(ch)
            break
        }
    }
}

// SSEProgressHandler handles Server-Sent Events for upload progress.
func (pt *ProgressTracker) SSEProgressHandler(w http.ResponseWriter, r *http.Request) {
    uploadID := r.URL.Query().Get("upload_id")

    pt.mu.RLock()
    progress, exists := pt.uploads[uploadID]
    pt.mu.RUnlock()

    if !exists {
        http.Error(w, "Upload not found", http.StatusNotFound)
        return
    }

    // Set SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "SSE not supported", http.StatusInternalServerError)
        return
    }

    // Subscribe to progress updates
    updates := progress.Subscribe()
    defer progress.Unsubscribe(updates)

    ctx := r.Context()

    for {
        select {
        case <-ctx.Done():
            return
        case update, ok := <-updates:
            if !ok {
                return
            }

            data, _ := json.Marshal(update)
            fmt.Fprintf(w, "data: %s\n\n", data)
            flusher.Flush()

            if update.Status == "completed" || update.Status == "error" {
                return
            }
        }
    }
}
```

## Validation and Security

Security is critical when handling file uploads. Let's implement comprehensive validation.

This module provides file validation including type checking, size limits, and malware scanning hooks:

```go
package main

import (
    "bytes"
    "errors"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "path/filepath"
    "strings"
)

var (
    ErrFileTooLarge     = errors.New("file exceeds maximum size limit")
    ErrInvalidFileType  = errors.New("file type not allowed")
    ErrMaliciousContent = errors.New("file contains potentially malicious content")
)

// FileValidator provides comprehensive file validation.
type FileValidator struct {
    // MaxFileSize is the maximum allowed file size in bytes
    MaxFileSize int64
    // AllowedTypes is a list of allowed MIME types
    AllowedTypes []string
    // AllowedExtensions is a list of allowed file extensions
    AllowedExtensions []string
    // BlockedExtensions is a list of explicitly blocked extensions
    BlockedExtensions []string
}

// DefaultValidator returns a validator with sensible defaults.
func DefaultValidator() *FileValidator {
    return &FileValidator{
        MaxFileSize: 100 * 1024 * 1024, // 100MB
        AllowedTypes: []string{
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/pdf",
            "text/plain",
            "application/zip",
        },
        AllowedExtensions: []string{
            ".jpg", ".jpeg", ".png", ".gif", ".webp",
            ".pdf", ".txt", ".zip",
        },
        BlockedExtensions: []string{
            ".exe", ".bat", ".cmd", ".sh", ".php",
            ".js", ".vbs", ".ps1", ".msi",
        },
    }
}

// ValidateFile performs comprehensive validation on an uploaded file.
func (v *FileValidator) ValidateFile(header *multipart.FileHeader, file io.ReadSeeker) error {
    // Check file size
    if header.Size > v.MaxFileSize {
        return fmt.Errorf("%w: %d bytes (max: %d)",
            ErrFileTooLarge, header.Size, v.MaxFileSize)
    }

    // Check file extension
    ext := strings.ToLower(filepath.Ext(header.Filename))

    // Check blocked extensions first
    for _, blocked := range v.BlockedExtensions {
        if ext == blocked {
            return fmt.Errorf("%w: %s extension is blocked", ErrInvalidFileType, ext)
        }
    }

    // Check if extension is in allowed list
    extAllowed := false
    for _, allowed := range v.AllowedExtensions {
        if ext == allowed {
            extAllowed = true
            break
        }
    }
    if !extAllowed && len(v.AllowedExtensions) > 0 {
        return fmt.Errorf("%w: %s extension not allowed", ErrInvalidFileType, ext)
    }

    // Detect actual content type by reading file header
    // Read the first 512 bytes for content detection
    buf := make([]byte, 512)
    n, err := file.Read(buf)
    if err != nil && err != io.EOF {
        return fmt.Errorf("error reading file: %w", err)
    }

    // Reset file position for further processing
    if _, err := file.Seek(0, io.SeekStart); err != nil {
        return fmt.Errorf("error resetting file position: %w", err)
    }

    // Detect content type
    contentType := http.DetectContentType(buf[:n])

    // Verify content type matches extension
    if err := v.validateContentType(contentType, ext); err != nil {
        return err
    }

    // Check for dangerous content patterns
    if err := v.scanForMaliciousContent(buf[:n]); err != nil {
        return err
    }

    return nil
}

// validateContentType ensures the detected content type matches the extension.
func (v *FileValidator) validateContentType(contentType, ext string) error {
    // Map extensions to expected content types
    expectedTypes := map[string][]string{
        ".jpg":  {"image/jpeg"},
        ".jpeg": {"image/jpeg"},
        ".png":  {"image/png"},
        ".gif":  {"image/gif"},
        ".webp": {"image/webp"},
        ".pdf":  {"application/pdf"},
        ".txt":  {"text/plain", "text/plain; charset=utf-8"},
        ".zip":  {"application/zip", "application/x-zip-compressed"},
    }

    expected, exists := expectedTypes[ext]
    if !exists {
        return nil // No specific validation for this extension
    }

    for _, exp := range expected {
        if strings.HasPrefix(contentType, strings.Split(exp, ";")[0]) {
            return nil
        }
    }

    return fmt.Errorf("%w: content type %s doesn't match extension %s",
        ErrInvalidFileType, contentType, ext)
}

// scanForMaliciousContent looks for dangerous patterns in the file header.
func (v *FileValidator) scanForMaliciousContent(header []byte) error {
    // Check for embedded scripts or executables disguised as other files
    dangerousPatterns := [][]byte{
        []byte("<?php"),
        []byte("<script"),
        []byte("javascript:"),
        []byte("vbscript:"),
        []byte("MZ"), // DOS executable header (if not a zip)
    }

    for _, pattern := range dangerousPatterns {
        if bytes.Contains(bytes.ToLower(header), bytes.ToLower(pattern)) {
            return fmt.Errorf("%w: dangerous pattern detected", ErrMaliciousContent)
        }
    }

    return nil
}

// SanitizeFilename removes or replaces dangerous characters from filenames.
func SanitizeFilename(filename string) string {
    // Get just the base name
    filename = filepath.Base(filename)

    // Replace dangerous characters
    replacer := strings.NewReplacer(
        "..", "",
        "/", "_",
        "\\", "_",
        "\x00", "",
        "<", "",
        ">", "",
        ":", "",
        "\"", "",
        "|", "",
        "?", "",
        "*", "",
    )

    filename = replacer.Replace(filename)

    // Ensure the filename is not empty after sanitization
    if filename == "" || filename == "." {
        filename = "unnamed_file"
    }

    return filename
}
```

We also need rate limiting to prevent abuse:

```go
package main

import (
    "net/http"
    "sync"
    "time"
)

// RateLimiter implements a token bucket rate limiter for uploads.
type RateLimiter struct {
    // requests tracks request counts per IP
    requests map[string]*clientLimit
    // maxRequests is the maximum requests per window
    maxRequests int
    // windowSize is the time window for rate limiting
    windowSize time.Duration
    mu         sync.Mutex
}

type clientLimit struct {
    count     int
    windowEnd time.Time
}

// NewRateLimiter creates a new rate limiter.
func NewRateLimiter(maxRequests int, windowSize time.Duration) *RateLimiter {
    rl := &RateLimiter{
        requests:    make(map[string]*clientLimit),
        maxRequests: maxRequests,
        windowSize:  windowSize,
    }

    // Start cleanup goroutine
    go rl.cleanup()

    return rl
}

// Allow checks if a request from the given IP should be allowed.
func (rl *RateLimiter) Allow(ip string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    now := time.Now()
    limit, exists := rl.requests[ip]

    if !exists || now.After(limit.windowEnd) {
        // New window
        rl.requests[ip] = &clientLimit{
            count:     1,
            windowEnd: now.Add(rl.windowSize),
        }
        return true
    }

    if limit.count >= rl.maxRequests {
        return false
    }

    limit.count++
    return true
}

// cleanup removes expired entries periodically.
func (rl *RateLimiter) cleanup() {
    ticker := time.NewTicker(rl.windowSize)
    for range ticker.C {
        rl.mu.Lock()
        now := time.Now()
        for ip, limit := range rl.requests {
            if now.After(limit.windowEnd) {
                delete(rl.requests, ip)
            }
        }
        rl.mu.Unlock()
    }
}

// Middleware wraps an HTTP handler with rate limiting.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ip := r.RemoteAddr
        // Extract IP from X-Forwarded-For if behind proxy
        if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
            ip = strings.Split(xff, ",")[0]
        }

        if !rl.Allow(ip) {
            http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

## Putting It All Together

Let's create a complete example that combines all these techniques into a production-ready upload service:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "os/signal"
    "path/filepath"
    "syscall"
    "time"
)

// UploadService combines all upload handling capabilities.
type UploadService struct {
    validator       *FileValidator
    progressTracker *ProgressTracker
    chunkedManager  *ChunkedUploadManager
    s3Uploader      *S3MultipartUploader
    rateLimiter     *RateLimiter
    uploadDir       string
}

// NewUploadService creates a new upload service with all dependencies.
func NewUploadService(config *Config) (*UploadService, error) {
    // Initialize S3 uploader if configured
    var s3Uploader *S3MultipartUploader
    if config.S3Bucket != "" {
        var err error
        s3Uploader, err = NewS3MultipartUploader(config.S3Bucket)
        if err != nil {
            return nil, fmt.Errorf("error initializing S3: %w", err)
        }
    }

    // Ensure upload directory exists
    if err := os.MkdirAll(config.UploadDir, 0755); err != nil {
        return nil, fmt.Errorf("error creating upload directory: %w", err)
    }

    return &UploadService{
        validator:       DefaultValidator(),
        progressTracker: NewProgressTracker(),
        chunkedManager:  NewChunkedUploadManager(config.UploadDir),
        s3Uploader:      s3Uploader,
        rateLimiter:     NewRateLimiter(100, time.Hour),
        uploadDir:       config.UploadDir,
    }, nil
}

// Config holds service configuration.
type Config struct {
    UploadDir string
    S3Bucket  string
    Port      string
}

// HandleUpload is the main entry point for file uploads.
// It supports both direct uploads and chunked uploads.
func (s *UploadService) HandleUpload(w http.ResponseWriter, r *http.Request) {
    // Determine upload type from headers
    if r.Header.Get("X-Upload-Type") == "chunked" {
        s.chunkedManager.UploadChunk(w, r)
        return
    }

    // Handle streaming upload
    s.handleStreamingUpload(w, r)
}

// handleStreamingUpload processes a streaming file upload.
func (s *UploadService) handleStreamingUpload(w http.ResponseWriter, r *http.Request) {
    // Limit request size
    r.Body = http.MaxBytesReader(w, r.Body, s.validator.MaxFileSize)

    // Parse multipart form
    reader, err := r.MultipartReader()
    if err != nil {
        http.Error(w, "Invalid multipart request", http.StatusBadRequest)
        return
    }

    var uploaded []string

    for {
        part, err := reader.NextPart()
        if err == io.EOF {
            break
        }
        if err != nil {
            http.Error(w, "Error reading request", http.StatusBadRequest)
            return
        }

        // Skip non-file parts
        if part.FileName() == "" {
            continue
        }

        // Validate and save the file
        filename, err := s.processUploadPart(r.Context(), part)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        uploaded = append(uploaded, filename)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status":  "success",
        "files":   uploaded,
        "message": fmt.Sprintf("Successfully uploaded %d file(s)", len(uploaded)),
    })
}

// processUploadPart handles a single file from the multipart stream.
func (s *UploadService) processUploadPart(ctx context.Context, part *multipart.Part) (string, error) {
    // Sanitize filename
    filename := SanitizeFilename(part.FileName())

    // Read first 512 bytes for validation
    header := make([]byte, 512)
    n, _ := io.ReadFull(part, header)

    // Create a reader that replays the header then continues with the rest
    fullReader := io.MultiReader(bytes.NewReader(header[:n]), part)

    // For S3 uploads
    if s.s3Uploader != nil {
        key := fmt.Sprintf("uploads/%s/%s", time.Now().Format("2006/01/02"), filename)

        _, err := s.s3Uploader.UploadStream(ctx, key, fullReader, part.Header.Get("Content-Type"))
        if err != nil {
            return "", fmt.Errorf("S3 upload failed: %w", err)
        }
        return key, nil
    }

    // For local storage
    dst, err := os.Create(filepath.Join(s.uploadDir, filename))
    if err != nil {
        return "", fmt.Errorf("error creating file: %w", err)
    }
    defer dst.Close()

    if _, err := io.Copy(dst, fullReader); err != nil {
        return "", fmt.Errorf("error saving file: %w", err)
    }

    return filename, nil
}

// SetupRoutes configures all HTTP routes for the upload service.
func (s *UploadService) SetupRoutes() http.Handler {
    mux := http.NewServeMux()

    // Main upload endpoint
    mux.HandleFunc("/upload", s.HandleUpload)

    // Chunked upload endpoints
    mux.HandleFunc("/upload/init", s.chunkedManager.InitiateUpload)
    mux.HandleFunc("/upload/chunk", s.chunkedManager.UploadChunk)
    mux.HandleFunc("/upload/complete", s.chunkedManager.CompleteUpload)
    mux.HandleFunc("/upload/status", s.chunkedManager.GetUploadStatus)

    // Progress endpoint (SSE)
    mux.HandleFunc("/upload/progress", s.progressTracker.SSEProgressHandler)

    // Health check
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        fmt.Fprint(w, "OK")
    })

    // Apply rate limiting
    return s.rateLimiter.Middleware(mux)
}

func main() {
    config := &Config{
        UploadDir: os.Getenv("UPLOAD_DIR"),
        S3Bucket:  os.Getenv("S3_BUCKET"),
        Port:      os.Getenv("PORT"),
    }

    if config.UploadDir == "" {
        config.UploadDir = "./uploads"
    }
    if config.Port == "" {
        config.Port = "8080"
    }

    service, err := NewUploadService(config)
    if err != nil {
        log.Fatalf("Error creating upload service: %v", err)
    }

    server := &http.Server{
        Addr:         ":" + config.Port,
        Handler:      service.SetupRoutes(),
        ReadTimeout:  30 * time.Minute,  // Long timeout for large uploads
        WriteTimeout: 30 * time.Minute,
        IdleTimeout:  120 * time.Second,
    }

    // Graceful shutdown
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan

        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        log.Println("Shutting down server...")
        server.Shutdown(ctx)
    }()

    log.Printf("Upload service starting on port %s", config.Port)
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

### Client-Side Implementation

Here's a JavaScript example showing how to use the chunked upload API:

```javascript
// ChunkedUploader handles resumable file uploads to the Go backend
class ChunkedUploader {
    constructor(file, options = {}) {
        this.file = file;
        this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB default
        this.baseUrl = options.baseUrl || '/upload';
        this.uploadId = null;
        this.uploadedChunks = new Set();
        this.onProgress = options.onProgress || (() => {});
    }

    // Initialize the upload session
    async init() {
        const response = await fetch(`${this.baseUrl}/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: this.file.name,
                total_size: this.file.size,
                chunk_size: this.chunkSize
            })
        });

        const data = await response.json();
        this.uploadId = data.id;
        this.totalChunks = data.total_chunks;
        return data;
    }

    // Upload a single chunk with retry support
    async uploadChunk(chunkNumber, retries = 3) {
        const start = chunkNumber * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await fetch(
                    `${this.baseUrl}/chunk?upload_id=${this.uploadId}&chunk=${chunkNumber}`,
                    { method: 'POST', body: chunk }
                );

                if (response.ok) {
                    this.uploadedChunks.add(chunkNumber);
                    this.onProgress({
                        uploaded: this.uploadedChunks.size,
                        total: this.totalChunks,
                        percentage: (this.uploadedChunks.size / this.totalChunks) * 100
                    });
                    return true;
                }
            } catch (error) {
                if (attempt === retries - 1) throw error;
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
        return false;
    }

    // Upload all chunks with concurrency control
    async upload(concurrency = 3) {
        await this.init();

        const chunks = Array.from({ length: this.totalChunks }, (_, i) => i);

        // Upload chunks with limited concurrency
        for (let i = 0; i < chunks.length; i += concurrency) {
            const batch = chunks.slice(i, i + concurrency);
            await Promise.all(batch.map(chunk => this.uploadChunk(chunk)));
        }

        // Complete the upload
        const response = await fetch(
            `${this.baseUrl}/complete?upload_id=${this.uploadId}`,
            { method: 'POST' }
        );
        return response.json();
    }

    // Resume a failed upload
    async resume() {
        const response = await fetch(
            `${this.baseUrl}/status?upload_id=${this.uploadId}`
        );
        const status = await response.json();

        // Upload missing chunks
        for (const chunkNumber of status.missing_chunks) {
            await this.uploadChunk(chunkNumber);
        }

        // Complete the upload
        return this.complete();
    }
}

// Usage example:
// const uploader = new ChunkedUploader(file, {
//     onProgress: (p) => console.log(`${p.percentage}% complete`)
// });
// await uploader.upload();
```

## Conclusion

Handling file uploads at scale requires careful consideration of memory usage, network reliability, and security. In this guide, we covered:

1. **Streaming uploads** to maintain constant memory usage regardless of file size
2. **Chunked uploads** for resumable transfers and better reliability
3. **S3 multipart integration** for efficient cloud storage
4. **Progress tracking** with SSE for real-time user feedback
5. **Comprehensive validation** including content-type verification and malicious content detection
6. **Rate limiting** to prevent abuse

Key takeaways:

- Never load entire files into memory; always stream
- Use chunked uploads for files over a few megabytes
- Validate file types by content, not just extension
- Implement proper rate limiting and security measures
- Provide progress feedback for better user experience

The complete code examples in this guide can be adapted to your specific needs. Remember to adjust chunk sizes, concurrency limits, and validation rules based on your application's requirements and infrastructure capabilities.

For monitoring your Go file upload service in production, consider integrating with OneUptime to track upload success rates, processing times, and error patterns. This observability is crucial for maintaining a reliable file upload system at scale.
