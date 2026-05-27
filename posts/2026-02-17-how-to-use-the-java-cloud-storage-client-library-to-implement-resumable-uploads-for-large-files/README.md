# How to Use the Java Cloud Storage Client Library to Implement Resumable Uploads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, Java, File Upload, Resumable Upload

Description: Implement resumable uploads for large files to Google Cloud Storage using the Java client library, with retry handling and progress tracking for reliable file transfers.

---

When you need to upload large files to Cloud Storage from a Java application, a simple single-request upload is not going to cut it. Network interruptions, timeouts, and memory constraints all become problems when you are dealing with files that are hundreds of megabytes or several gigabytes. Resumable uploads solve this by breaking the upload into chunks and allowing you to resume from where you left off if something goes wrong.

The Java Cloud Storage client library supports resumable uploads natively. In this post, I will show you how to use it properly.

## How Resumable Uploads Work

A resumable upload has three phases:

1. **Initiate** - You send a request to Cloud Storage to start a resumable upload. Cloud Storage returns a session URI.
2. **Upload chunks** - You send the file data in chunks to the session URI. Each chunk is acknowledged by the server.
3. **Finalize** - When the last chunk is sent, the upload is complete and the object is available.

If the upload is interrupted, you can query the session URI to find out how much data was received and resume from that point.

## Adding the Dependency

```xml
<!-- Google Cloud Storage client library -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-storage</artifactId>
    <version>2.68.0</version>
</dependency>
```

## Basic Resumable Upload with WriteChannel

The simplest way to do a resumable upload is with the `WriteChannel` API. The library handles chunking and resumption automatically.

```java
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import com.google.cloud.WriteChannel;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;

public class StorageUploader {

    private final Storage storage;

    public StorageUploader() {
        // Create the client with default credentials
        this.storage = StorageOptions.getDefaultInstance().getService();
    }

    public StorageUploader(Storage storage) {
        this.storage = storage;
    }

    // Upload a file using a WriteChannel - automatically uses resumable upload
    public void uploadFile(String bucketName, String objectName, Path filePath)
            throws IOException {

        BlobId blobId = BlobId.of(bucketName, objectName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(detectContentType(filePath))
                .build();

        // Open a WriteChannel - this initiates a resumable upload session
        try (WriteChannel writer = storage.writer(blobInfo)) {
            // Set the buffer size (default is 15 MiB)
            writer.setChunkSize(8 * 1024 * 1024); // 8 MiB buffer

            // Read the file and write it in buffered chunks
            byte[] buffer = new byte[8 * 1024 * 1024];
            try (InputStream inputStream = Files.newInputStream(filePath)) {
                int bytesRead;
                long totalBytesWritten = 0;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    writer.write(ByteBuffer.wrap(buffer, 0, bytesRead));
                    totalBytesWritten += bytesRead;
                    System.out.println("Uploaded: " + formatBytes(totalBytesWritten));
                }
            }
        }

        System.out.println("Upload complete: gs://" + bucketName + "/" + objectName);
    }

    private String detectContentType(Path filePath) throws IOException {
        String contentType = Files.probeContentType(filePath);
        return contentType != null ? contentType : "application/octet-stream";
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024) + " KB";
        return (bytes / (1024 * 1024)) + " MB";
    }
}
```

## Upload with Progress Tracking

For a better user experience, track progress as a percentage:

```java
// Upload a file with progress reporting callback
public void uploadWithProgress(String bucketName, String objectName, Path filePath,
                                ProgressCallback callback) throws IOException {

    long fileSize = Files.size(filePath);
    BlobId blobId = BlobId.of(bucketName, objectName);
    BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
            .setContentType(detectContentType(filePath))
            .build();

    try (WriteChannel writer = storage.writer(blobInfo)) {
        writer.setChunkSize(8 * 1024 * 1024);

        byte[] buffer = new byte[8 * 1024 * 1024];
        long totalBytesWritten = 0;

        try (InputStream inputStream = Files.newInputStream(filePath)) {
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                writer.write(ByteBuffer.wrap(buffer, 0, bytesRead));
                totalBytesWritten += bytesRead;

                // Report progress
                double progress = (double) totalBytesWritten / fileSize * 100;
                callback.onProgress(totalBytesWritten, fileSize, progress);
            }
        }

        callback.onComplete(totalBytesWritten);
    }
}

// Callback interface for upload progress
@FunctionalInterface
public interface ProgressCallback {
    void onProgress(long bytesUploaded, long totalBytes, double percentComplete);

    default void onComplete(long totalBytes) {
        System.out.println("Upload complete: " + totalBytes + " bytes");
    }
}
```

Usage:

```java
// Upload with progress logging
uploader.uploadWithProgress("my-bucket", "large-file.zip", filePath,
        (uploaded, total, percent) ->
                System.out.printf("Progress: %.1f%% (%s / %s)%n",
                        percent, formatBytes(uploaded), formatBytes(total)));
```

## Resumable Upload with Retry Settings

The Java client library already retries transient failures, such as connection errors, `408`, `429`, and `5xx` responses. For production use, configure the client retry settings instead of retrying by skipping bytes in the local file:

```java
import com.google.api.gax.retrying.RetrySettings;
import com.google.cloud.storage.StorageOptions;
import java.time.Duration;

public static StorageUploader createUploaderWithRetries() {
    RetrySettings retrySettings = StorageOptions.getDefaultRetrySettings().toBuilder()
            .setMaxAttempts(6)
            .setInitialRetryDelayDuration(Duration.ofSeconds(1))
            .setRetryDelayMultiplier(2.0)
            .setMaxRetryDelayDuration(Duration.ofSeconds(32))
            .setTotalTimeoutDuration(Duration.ofMinutes(10))
            .build();

    Storage storage = StorageOptions.newBuilder()
            .setRetrySettings(retrySettings)
            .build()
            .getService();

    return new StorageUploader(storage);
}
```

Then use the same `WriteChannel` upload code:

```java
// Resumable upload using the configured retry policy
public void uploadWithRetry(String bucketName, String objectName, Path filePath,
                            ProgressCallback callback) throws IOException {

    long fileSize = Files.size(filePath);
    BlobId blobId = BlobId.of(bucketName, objectName);
    BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
            .setContentType(detectContentType(filePath))
            .build();

    try (WriteChannel writer = storage.writer(blobInfo);
         InputStream inputStream = Files.newInputStream(filePath)) {
        writer.setChunkSize(8 * 1024 * 1024);

        byte[] buffer = new byte[8 * 1024 * 1024];
        long totalBytesWritten = 0;
        int bytesRead;

        while ((bytesRead = inputStream.read(buffer)) != -1) {
            writer.write(ByteBuffer.wrap(buffer, 0, bytesRead));
            totalBytesWritten += bytesRead;

            double progress = (double) totalBytesWritten / fileSize * 100;
            callback.onProgress(totalBytesWritten, fileSize, progress);
        }

        callback.onComplete(totalBytesWritten);
    }
}
```

## Uploading from an InputStream

Sometimes you do not have a file on disk. Maybe you are receiving data from an HTTP request or generating it on the fly:

```java
// Upload from an InputStream without knowing the total size upfront
public void uploadFromStream(String bucketName, String objectName,
                              InputStream inputStream, String contentType) throws IOException {

    BlobId blobId = BlobId.of(bucketName, objectName);
    BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
            .setContentType(contentType)
            .build();

    // WriteChannel works with streams too
    try (WriteChannel writer = storage.writer(blobInfo)) {
        writer.setChunkSize(8 * 1024 * 1024);

        byte[] buffer = new byte[8 * 1024 * 1024];
        int bytesRead;

        while ((bytesRead = inputStream.read(buffer)) != -1) {
            writer.write(ByteBuffer.wrap(buffer, 0, bytesRead));
        }
    }
}
```

## Setting Object Metadata

You can attach metadata to the upload:

```java
// Upload with custom metadata and storage class
public void uploadWithMetadata(String bucketName, String objectName, Path filePath,
                                Map<String, String> metadata) throws IOException {

    BlobId blobId = BlobId.of(bucketName, objectName);
    BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
            .setContentType(detectContentType(filePath))
            .setMetadata(metadata)
            .setStorageClass(StorageClass.STANDARD)
            // Set cache control for CDN
            .setCacheControl("public, max-age=3600")
            .build();

    try (WriteChannel writer = storage.writer(blobInfo)) {
        writer.setChunkSize(8 * 1024 * 1024);

        byte[] buffer = new byte[8 * 1024 * 1024];
        try (InputStream inputStream = Files.newInputStream(filePath)) {
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                writer.write(ByteBuffer.wrap(buffer, 0, bytesRead));
            }
        }
    }
}
```

## Spring Boot Integration

Here is how you would integrate this into a Spring Boot REST controller:

```java
@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final StorageUploader uploader;

    public FileUploadController(StorageUploader uploader) {
        this.uploader = uploader;
    }

    // Handle multipart file upload and forward to Cloud Storage
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("bucket") String bucket) throws IOException {

        String objectName = UUID.randomUUID() + "-" + file.getOriginalFilename();

        uploader.uploadFromStream(bucket, objectName,
                file.getInputStream(), file.getContentType());

        return ResponseEntity.ok(Map.of(
                "bucket", bucket,
                "object", objectName,
                "url", "gs://" + bucket + "/" + objectName));
    }
}
```

## Chunk Size Considerations

The buffer size affects both memory usage and upload efficiency. Smaller buffers use less memory but make more HTTP requests. Larger buffers are more efficient but use more memory.

For most cases, 8 MiB buffers work well. If you are on a fast network, increase to 16 MiB or 32 MiB. If memory is tight (like in a Cloud Function), reduce to 2 MiB or 4 MiB. The buffer size has a minimum of 256 KiB, and the client rounds it to a multiple of 256 KiB.

## Wrapping Up

Resumable uploads are essential when working with large files on Cloud Storage. The Java client library's `WriteChannel` API handles the resumable upload protocol for you, including buffering and session management. For production use, add progress tracking and configure retry settings with exponential backoff. The key is choosing the right buffer size for your environment and making sure your upload logic can handle network interruptions gracefully.
