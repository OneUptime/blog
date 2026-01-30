# How to Build File Upload Service in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, File Upload, HTTP, Storage

Description: Learn how to build a robust file upload service in Go with multipart handling, validation, and storage options.

---

File uploads are a fundamental feature in many web applications. Go's standard library provides excellent support for handling multipart form data, making it straightforward to build a production-ready file upload service. In this guide, we'll cover everything from basic multipart parsing to advanced features like streaming uploads and S3 storage.

## Parsing Multipart Forms

The foundation of any file upload service is parsing multipart form data. Go's `net/http` package handles this elegantly:

```go
func uploadHandler(w http.ResponseWriter, r *http.Request) {
    // Limit the request body size to 32MB
    r.Body = http.MaxBytesReader(w, r.Body, 32<<20)

    // Parse the multipart form with 10MB max memory
    if err := r.ParseMultipartForm(10 << 20); err != nil {
        http.Error(w, "File too large", http.StatusBadRequest)
        return
    }

    file, header, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "Error retrieving file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    fmt.Printf("Uploaded: %s (%d bytes)\n", header.Filename, header.Size)
}
```

The `ParseMultipartForm` method stores files up to the specified memory limit in memory, with the remainder written to temporary files on disk.

## Implementing File Size Limits

Protecting your server from oversized uploads is critical. Use `http.MaxBytesReader` to enforce strict limits:

```go
const maxUploadSize = 50 << 20 // 50MB

func limitedUploadHandler(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

    if err := r.ParseMultipartForm(maxUploadSize); err != nil {
        if err.Error() == "http: request body too large" {
            http.Error(w, "File exceeds 50MB limit", http.StatusRequestEntityTooLarge)
            return
        }
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
}
```

## MIME Type Validation

Never trust the client-provided content type. Always validate the actual file content:

```go
func validateMIMEType(file multipart.File, allowedTypes []string) (string, error) {
    // Read the first 512 bytes for detection
    buffer := make([]byte, 512)
    _, err := file.Read(buffer)
    if err != nil {
        return "", err
    }

    // Reset file pointer
    file.Seek(0, 0)

    // Detect content type
    contentType := http.DetectContentType(buffer)

    for _, allowed := range allowedTypes {
        if contentType == allowed {
            return contentType, nil
        }
    }

    return "", fmt.Errorf("file type %s not allowed", contentType)
}

// Usage
allowedTypes := []string{"image/jpeg", "image/png", "application/pdf"}
mimeType, err := validateMIMEType(file, allowedTypes)
```

## Streaming Uploads to Disk

For memory-efficient handling of large files, stream directly to disk without loading the entire file into memory:

```go
func streamToDisk(file multipart.File, filename string) error {
    uploadDir := "./uploads"
    os.MkdirAll(uploadDir, 0755)

    // Generate safe filename
    safeName := filepath.Base(filename)
    destPath := filepath.Join(uploadDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeName))

    dst, err := os.Create(destPath)
    if err != nil {
        return err
    }
    defer dst.Close()

    // Stream copy with buffer
    _, err = io.Copy(dst, file)
    return err
}
```

## Uploading to Amazon S3

For production systems, storing files in cloud storage like S3 provides durability and scalability:

```go
import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/s3/s3manager"
)

func uploadToS3(file multipart.File, filename, bucket string) (string, error) {
    sess := session.Must(session.NewSession(&aws.Config{
        Region: aws.String("us-east-1"),
    }))

    uploader := s3manager.NewUploader(sess)

    key := fmt.Sprintf("uploads/%d_%s", time.Now().UnixNano(), filename)

    result, err := uploader.Upload(&s3manager.UploadInput{
        Bucket: aws.String(bucket),
        Key:    aws.String(key),
        Body:   file,
    })
    if err != nil {
        return "", err
    }

    return result.Location, nil
}
```

## Tracking Upload Progress

For large files, providing progress feedback improves user experience. Create a custom reader that tracks bytes transferred:

```go
type ProgressReader struct {
    Reader     io.Reader
    Total      int64
    Current    int64
    OnProgress func(current, total int64)
}

func (pr *ProgressReader) Read(p []byte) (int, error) {
    n, err := pr.Reader.Read(p)
    pr.Current += int64(n)

    if pr.OnProgress != nil {
        pr.OnProgress(pr.Current, pr.Total)
    }

    return n, err
}

// Usage with S3 upload
progressReader := &ProgressReader{
    Reader: file,
    Total:  header.Size,
    OnProgress: func(current, total int64) {
        percentage := float64(current) / float64(total) * 100
        fmt.Printf("\rUploading: %.2f%%", percentage)
    },
}
```

## Complete Upload Service

Here's a complete example combining all concepts:

```go
func main() {
    http.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        r.Body = http.MaxBytesReader(w, r.Body, 50<<20)

        if err := r.ParseMultipartForm(10 << 20); err != nil {
            http.Error(w, "Upload failed", http.StatusBadRequest)
            return
        }

        file, header, err := r.FormFile("file")
        if err != nil {
            http.Error(w, "No file provided", http.StatusBadRequest)
            return
        }
        defer file.Close()

        allowedTypes := []string{"image/jpeg", "image/png", "application/pdf"}
        if _, err := validateMIMEType(file, allowedTypes); err != nil {
            http.Error(w, err.Error(), http.StatusUnsupportedMediaType)
            return
        }

        if err := streamToDisk(file, header.Filename); err != nil {
            http.Error(w, "Storage failed", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusOK)
        fmt.Fprintf(w, "File %s uploaded successfully", header.Filename)
    })

    http.ListenAndServe(":8080", nil)
}
```

## Conclusion

Building a file upload service in Go is straightforward thanks to the robust standard library. Key considerations include enforcing size limits early, validating MIME types server-side, streaming large files to avoid memory exhaustion, and choosing appropriate storage backends. With these patterns, you can build a secure, efficient file upload service ready for production workloads.
