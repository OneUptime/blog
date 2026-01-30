# How to Handle Large File Downloads in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, HTTP, Files, Performance

Description: Learn how to efficiently handle large file downloads in Go with streaming, progress tracking, and proper resource management.

---

When serving large files over HTTP, loading the entire file into memory before sending it to the client is a recipe for disaster. A few concurrent downloads of multi-gigabyte files will quickly exhaust your server's memory. Go's standard library provides excellent tools for streaming files efficiently, and this post covers the essential techniques.

## Basic File Streaming with io.Copy

The simplest approach uses `io.Copy` to stream data directly from the file to the HTTP response:

```go
package main

import (
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strconv"
)

func downloadHandler(w http.ResponseWriter, r *http.Request) {
    // Get the file path from query parameter
    filePath := r.URL.Query().Get("file")
    if filePath == "" {
        http.Error(w, "file parameter required", http.StatusBadRequest)
        return
    }

    // Open the file
    file, err := os.Open(filePath)
    if err != nil {
        http.Error(w, "file not found", http.StatusNotFound)
        return
    }
    defer file.Close()

    // Get file info for Content-Length header
    stat, err := file.Stat()
    if err != nil {
        http.Error(w, "failed to get file info", http.StatusInternalServerError)
        return
    }

    // Set headers for file download
    w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(filePath))
    w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("Content-Length", strconv.FormatInt(stat.Size(), 10))

    // Stream the file to the response
    // io.Copy uses a 32KB buffer internally, so memory usage stays constant
    _, err = io.Copy(w, file)
    if err != nil {
        // Client likely disconnected - log but don't try to write error response
        return
    }
}

func main() {
    http.HandleFunc("/download", downloadHandler)
    http.ListenAndServe(":8080", nil)
}
```

The key here is `io.Copy`, which reads from the file in chunks (32KB by default) and writes directly to the response. Memory usage stays constant regardless of file size.

## Progress Tracking with Custom Reader

For logging or metrics, you can wrap the file in a custom reader that tracks progress:

```go
package main

import (
    "fmt"
    "io"
    "sync/atomic"
    "time"
)

// ProgressReader wraps an io.Reader and tracks bytes read
type ProgressReader struct {
    reader      io.Reader
    total       int64
    read        int64
    onProgress  func(read, total int64)
}

// NewProgressReader creates a reader that reports progress
func NewProgressReader(r io.Reader, total int64, onProgress func(read, total int64)) *ProgressReader {
    return &ProgressReader{
        reader:     r,
        total:      total,
        onProgress: onProgress,
    }
}

func (pr *ProgressReader) Read(p []byte) (int, error) {
    n, err := pr.reader.Read(p)
    if n > 0 {
        atomic.AddInt64(&pr.read, int64(n))
        if pr.onProgress != nil {
            pr.onProgress(atomic.LoadInt64(&pr.read), pr.total)
        }
    }
    return n, err
}

// Usage in handler
func downloadWithProgress(w http.ResponseWriter, r *http.Request, filePath string) {
    file, err := os.Open(filePath)
    if err != nil {
        http.Error(w, "file not found", http.StatusNotFound)
        return
    }
    defer file.Close()

    stat, _ := file.Stat()
    fileSize := stat.Size()

    // Track progress every 10%
    lastPercent := 0
    progressReader := NewProgressReader(file, fileSize, func(read, total int64) {
        percent := int(float64(read) / float64(total) * 100)
        if percent >= lastPercent+10 {
            lastPercent = percent
            fmt.Printf("Download progress: %d%% (%d/%d bytes)\n", percent, read, total)
        }
    })

    w.Header().Set("Content-Length", strconv.FormatInt(fileSize, 10))
    io.Copy(w, progressReader)
}
```

## Resumable Downloads with Range Requests

For large files, clients may need to resume interrupted downloads. HTTP range requests make this possible:

```go
package main

import (
    "fmt"
    "io"
    "net/http"
    "os"
    "strconv"
    "strings"
)

func rangeDownloadHandler(w http.ResponseWriter, r *http.Request) {
    filePath := "/path/to/large/file.zip"

    file, err := os.Open(filePath)
    if err != nil {
        http.Error(w, "file not found", http.StatusNotFound)
        return
    }
    defer file.Close()

    stat, _ := file.Stat()
    fileSize := stat.Size()

    // Check for Range header
    rangeHeader := r.Header.Get("Range")
    if rangeHeader == "" {
        // No range requested - serve entire file
        w.Header().Set("Content-Length", strconv.FormatInt(fileSize, 10))
        w.Header().Set("Accept-Ranges", "bytes")
        io.Copy(w, file)
        return
    }

    // Parse range header (format: "bytes=start-end")
    // Example: "bytes=0-499" or "bytes=500-" or "bytes=-500"
    rangeHeader = strings.TrimPrefix(rangeHeader, "bytes=")
    parts := strings.Split(rangeHeader, "-")

    var start, end int64

    if parts[0] == "" {
        // Suffix range: "-500" means last 500 bytes
        suffix, _ := strconv.ParseInt(parts[1], 10, 64)
        start = fileSize - suffix
        end = fileSize - 1
    } else {
        start, _ = strconv.ParseInt(parts[0], 10, 64)
        if parts[1] == "" {
            // Open-ended range: "500-" means from byte 500 to end
            end = fileSize - 1
        } else {
            end, _ = strconv.ParseInt(parts[1], 10, 64)
        }
    }

    // Validate range
    if start < 0 || start >= fileSize || end >= fileSize || start > end {
        w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", fileSize))
        http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
        return
    }

    // Seek to start position
    file.Seek(start, io.SeekStart)

    // Calculate content length for this range
    contentLength := end - start + 1

    // Set headers for partial content
    w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileSize))
    w.Header().Set("Content-Length", strconv.FormatInt(contentLength, 10))
    w.Header().Set("Accept-Ranges", "bytes")
    w.WriteHeader(http.StatusPartialContent)

    // Copy only the requested range
    io.CopyN(w, file, contentLength)
}
```

## Handling Client Disconnection

When a client disconnects mid-download, you should stop reading the file to free resources:

```go
func downloadWithCancellation(w http.ResponseWriter, r *http.Request) {
    filePath := "/path/to/file.zip"

    file, err := os.Open(filePath)
    if err != nil {
        http.Error(w, "file not found", http.StatusNotFound)
        return
    }
    defer file.Close()

    // Get the request context - it's cancelled when client disconnects
    ctx := r.Context()

    // Create a buffer for copying
    buf := make([]byte, 32*1024) // 32KB buffer

    for {
        // Check if client disconnected
        select {
        case <-ctx.Done():
            // Client disconnected - stop sending
            return
        default:
        }

        // Read chunk from file
        n, readErr := file.Read(buf)
        if n > 0 {
            _, writeErr := w.Write(buf[:n])
            if writeErr != nil {
                // Write failed - client likely disconnected
                return
            }
        }

        if readErr == io.EOF {
            break
        }
        if readErr != nil {
            return
        }
    }
}
```

## Complete Production Example

Here is a complete handler that combines all the techniques:

```go
package main

import (
    "context"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "strconv"
    "strings"
    "time"
)

// FileServer handles large file downloads efficiently
type FileServer struct {
    basePath string
    logger   *log.Logger
}

func NewFileServer(basePath string) *FileServer {
    return &FileServer{
        basePath: basePath,
        logger:   log.Default(),
    }
}

func (fs *FileServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Extract filename from URL path
    filename := strings.TrimPrefix(r.URL.Path, "/files/")
    if filename == "" {
        http.Error(w, "filename required", http.StatusBadRequest)
        return
    }

    // Prevent directory traversal attacks
    cleanPath := filepath.Clean(filename)
    if strings.Contains(cleanPath, "..") {
        http.Error(w, "invalid path", http.StatusBadRequest)
        return
    }

    fullPath := filepath.Join(fs.basePath, cleanPath)

    // Open file
    file, err := os.Open(fullPath)
    if err != nil {
        if os.IsNotExist(err) {
            http.Error(w, "file not found", http.StatusNotFound)
        } else {
            http.Error(w, "failed to open file", http.StatusInternalServerError)
        }
        return
    }
    defer file.Close()

    // Get file info
    stat, err := file.Stat()
    if err != nil {
        http.Error(w, "failed to stat file", http.StatusInternalServerError)
        return
    }

    if stat.IsDir() {
        http.Error(w, "cannot download directory", http.StatusBadRequest)
        return
    }

    fileSize := stat.Size()
    start := int64(0)
    end := fileSize - 1

    // Handle range request
    rangeHeader := r.Header.Get("Range")
    if rangeHeader != "" {
        var parseErr error
        start, end, parseErr = fs.parseRange(rangeHeader, fileSize)
        if parseErr != nil {
            w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", fileSize))
            http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
            return
        }
    }

    // Set response headers
    w.Header().Set("Accept-Ranges", "bytes")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filepath.Base(fullPath)))
    w.Header().Set("Content-Type", "application/octet-stream")

    contentLength := end - start + 1
    w.Header().Set("Content-Length", strconv.FormatInt(contentLength, 10))

    if rangeHeader != "" {
        w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileSize))
        w.WriteHeader(http.StatusPartialContent)
    }

    // Seek to start if needed
    if start > 0 {
        if _, err := file.Seek(start, io.SeekStart); err != nil {
            return
        }
    }

    // Stream the file with cancellation support
    fs.streamFile(r.Context(), w, file, contentLength)
}

func (fs *FileServer) parseRange(rangeHeader string, fileSize int64) (int64, int64, error) {
    rangeHeader = strings.TrimPrefix(rangeHeader, "bytes=")
    parts := strings.Split(rangeHeader, "-")

    var start, end int64
    var err error

    if parts[0] == "" {
        suffix, _ := strconv.ParseInt(parts[1], 10, 64)
        start = fileSize - suffix
        end = fileSize - 1
    } else {
        start, err = strconv.ParseInt(parts[0], 10, 64)
        if err != nil {
            return 0, 0, err
        }
        if parts[1] == "" {
            end = fileSize - 1
        } else {
            end, err = strconv.ParseInt(parts[1], 10, 64)
            if err != nil {
                return 0, 0, err
            }
        }
    }

    if start < 0 || start >= fileSize || end >= fileSize || start > end {
        return 0, 0, fmt.Errorf("invalid range")
    }

    return start, end, nil
}

func (fs *FileServer) streamFile(ctx context.Context, w http.ResponseWriter, file *os.File, length int64) {
    buf := make([]byte, 32*1024)
    remaining := length
    startTime := time.Now()

    for remaining > 0 {
        select {
        case <-ctx.Done():
            fs.logger.Printf("Client disconnected after %d bytes", length-remaining)
            return
        default:
        }

        toRead := int64(len(buf))
        if remaining < toRead {
            toRead = remaining
        }

        n, err := file.Read(buf[:toRead])
        if n > 0 {
            written, writeErr := w.Write(buf[:n])
            if writeErr != nil {
                fs.logger.Printf("Write error: %v", writeErr)
                return
            }
            remaining -= int64(written)
        }

        if err == io.EOF {
            break
        }
        if err != nil {
            fs.logger.Printf("Read error: %v", err)
            return
        }
    }

    duration := time.Since(startTime)
    fs.logger.Printf("Served %d bytes in %v", length, duration)
}

func main() {
    server := NewFileServer("/var/files")
    http.Handle("/files/", server)
    log.Println("Starting server on :8080")
    http.ListenAndServe(":8080", nil)
}
```

## Summary

| Technique | Use Case |
|-----------|----------|
| `io.Copy` | Basic streaming with constant memory |
| Custom Reader | Progress tracking and logging |
| Range requests | Resumable downloads |
| Context cancellation | Clean up on client disconnect |
| Path validation | Security against traversal attacks |

Efficient file downloads in Go come down to streaming data in chunks rather than loading it all into memory. The standard library's `io.Copy` handles most cases, and adding range request support makes your downloads resumable. Always clean up resources when clients disconnect to keep your server healthy under load.
