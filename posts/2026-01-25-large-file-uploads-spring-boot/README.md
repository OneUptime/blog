# How to Handle Large File Uploads in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, File Upload, Streaming, Multipart

Description: Learn how to handle large file uploads in Spring Boot efficiently using streaming, chunked uploads, and proper configuration to avoid memory issues and timeouts.

---

> Uploading large files is one of those features that seems straightforward until you try to scale it. The default Spring Boot configuration works fine for small files, but once users start uploading videos, datasets, or backups, things fall apart quickly. This guide shows you how to build a robust file upload system that handles gigabyte-sized files without crashing your server.

Most developers discover the hard way that their file upload endpoint breaks when someone tries to upload a 500MB video. The server runs out of memory, the connection times out, or worse - the upload silently fails halfway through. Let's fix that.

---

## The Problem with Default File Uploads

Spring Boot's default multipart file handling loads the entire file into memory before your controller even sees it. For a 2GB file, that means your JVM needs 2GB of heap space just for that one request. Multiply that by concurrent uploads and you're looking at OutOfMemoryError exceptions.

Here's what happens with the typical approach:

```java
// This works for small files but fails for large ones
@PostMapping("/upload")
public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
    // By the time we get here, the entire file is already in memory
    file.transferTo(new File("/uploads/" + file.getOriginalFilename()));
    return ResponseEntity.ok("Uploaded");
}
```

---

## Configuring Spring Boot for Large Files

First, let's configure Spring Boot to handle large files properly. Add these properties to your `application.properties`:

```properties
# Maximum file size (default is 1MB)
spring.servlet.multipart.max-file-size=10GB

# Maximum request size (includes all files and form data)
spring.servlet.multipart.max-request-size=10GB

# Threshold after which files are written to disk instead of memory
spring.servlet.multipart.file-size-threshold=2MB

# Temporary directory for file storage during upload
spring.servlet.multipart.location=/tmp/uploads

# Enable lazy resolution of multipart requests
spring.servlet.multipart.resolve-lazily=true
```

The key setting here is `file-size-threshold`. Files larger than 2MB will be written to a temporary file on disk instead of being held in memory. This single change prevents most memory issues.

---

## Streaming File Uploads

For true efficiency, skip the MultipartFile abstraction entirely and work with the raw input stream. This approach processes files in chunks without ever loading the whole thing into memory:

```java
// FileUploadController.java
@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final FileStorageService storageService;

    public FileUploadController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/upload/stream")
    public ResponseEntity<UploadResponse> uploadFileStream(HttpServletRequest request)
            throws IOException, ServletException {

        // Get the file part from the multipart request
        Part filePart = request.getPart("file");

        if (filePart == null) {
            return ResponseEntity.badRequest()
                .body(new UploadResponse(null, "No file provided"));
        }

        String filename = extractFilename(filePart);

        // Stream directly to storage - never loads full file into memory
        try (InputStream inputStream = filePart.getInputStream()) {
            String fileId = storageService.storeStream(inputStream, filename);
            return ResponseEntity.ok(new UploadResponse(fileId, "Upload successful"));
        }
    }

    private String extractFilename(Part part) {
        String contentDisposition = part.getHeader("content-disposition");
        for (String token : contentDisposition.split(";")) {
            if (token.trim().startsWith("filename")) {
                return token.substring(token.indexOf('=') + 1).trim()
                    .replace("\"", "");
            }
        }
        return "unknown";
    }
}
```

The storage service handles the actual file writing:

```java
// FileStorageService.java
@Service
public class FileStorageService {

    private final Path uploadDirectory;

    // 8KB buffer for streaming - adjust based on your needs
    private static final int BUFFER_SIZE = 8192;

    public FileStorageService(@Value("${app.upload.dir:/tmp/uploads}") String uploadDir) {
        this.uploadDirectory = Paths.get(uploadDir);
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    public String storeStream(InputStream inputStream, String originalFilename)
            throws IOException {

        // Generate unique file ID to prevent collisions
        String fileId = UUID.randomUUID().toString();
        String extension = getExtension(originalFilename);
        String storedFilename = fileId + extension;

        Path targetPath = uploadDirectory.resolve(storedFilename);

        // Stream file to disk in chunks
        try (OutputStream outputStream = Files.newOutputStream(targetPath)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int bytesRead;
            long totalBytes = 0;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;

                // Optional: log progress for very large files
                if (totalBytes % (100 * 1024 * 1024) == 0) {
                    System.out.println("Uploaded " + (totalBytes / 1024 / 1024) + " MB");
                }
            }
        }

        return fileId;
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return dotIndex > 0 ? filename.substring(dotIndex) : "";
    }
}
```

---

## Chunked Uploads for Reliability

Network connections drop. Browsers crash. For truly large files, implement chunked uploads that allow resumption:

```java
// ChunkedUploadController.java
@RestController
@RequestMapping("/api/files/chunked")
public class ChunkedUploadController {

    private final ChunkedUploadService uploadService;

    public ChunkedUploadController(ChunkedUploadService uploadService) {
        this.uploadService = uploadService;
    }

    // Initialize a new chunked upload session
    @PostMapping("/init")
    public ResponseEntity<InitResponse> initUpload(
            @RequestParam String filename,
            @RequestParam long totalSize,
            @RequestParam int totalChunks) {

        String uploadId = uploadService.initializeUpload(filename, totalSize, totalChunks);
        return ResponseEntity.ok(new InitResponse(uploadId));
    }

    // Upload a single chunk
    @PostMapping("/chunk")
    public ResponseEntity<ChunkResponse> uploadChunk(
            @RequestParam String uploadId,
            @RequestParam int chunkIndex,
            @RequestParam("chunk") MultipartFile chunk) throws IOException {

        boolean isComplete = uploadService.processChunk(uploadId, chunkIndex, chunk);

        if (isComplete) {
            String fileId = uploadService.finalizeUpload(uploadId);
            return ResponseEntity.ok(new ChunkResponse(true, fileId));
        }

        return ResponseEntity.ok(new ChunkResponse(false, null));
    }

    // Check which chunks have been uploaded - useful for resuming
    @GetMapping("/status/{uploadId}")
    public ResponseEntity<UploadStatus> getStatus(@PathVariable String uploadId) {
        UploadStatus status = uploadService.getStatus(uploadId);
        return ResponseEntity.ok(status);
    }
}
```

The chunked upload service manages the upload state:

```java
// ChunkedUploadService.java
@Service
public class ChunkedUploadService {

    private final Path chunkDirectory;
    private final Map<String, UploadSession> sessions = new ConcurrentHashMap<>();

    public ChunkedUploadService(@Value("${app.chunk.dir:/tmp/chunks}") String chunkDir) {
        this.chunkDirectory = Paths.get(chunkDir);
        try {
            Files.createDirectories(this.chunkDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not create chunk directory", e);
        }
    }

    public String initializeUpload(String filename, long totalSize, int totalChunks) {
        String uploadId = UUID.randomUUID().toString();

        UploadSession session = new UploadSession();
        session.filename = filename;
        session.totalSize = totalSize;
        session.totalChunks = totalChunks;
        session.receivedChunks = new boolean[totalChunks];
        session.createdAt = Instant.now();

        sessions.put(uploadId, session);
        return uploadId;
    }

    public boolean processChunk(String uploadId, int chunkIndex, MultipartFile chunk)
            throws IOException {

        UploadSession session = sessions.get(uploadId);
        if (session == null) {
            throw new IllegalArgumentException("Unknown upload session");
        }

        // Save chunk to disk
        Path chunkPath = chunkDirectory.resolve(uploadId + "_" + chunkIndex);
        chunk.transferTo(chunkPath.toFile());

        // Mark chunk as received
        session.receivedChunks[chunkIndex] = true;

        // Check if all chunks received
        for (boolean received : session.receivedChunks) {
            if (!received) return false;
        }
        return true;
    }

    public String finalizeUpload(String uploadId) throws IOException {
        UploadSession session = sessions.get(uploadId);
        String fileId = UUID.randomUUID().toString();
        String extension = getExtension(session.filename);

        Path finalPath = chunkDirectory.getParent()
            .resolve("uploads")
            .resolve(fileId + extension);

        // Combine all chunks into final file
        try (OutputStream out = Files.newOutputStream(finalPath)) {
            for (int i = 0; i < session.totalChunks; i++) {
                Path chunkPath = chunkDirectory.resolve(uploadId + "_" + i);
                Files.copy(chunkPath, out);
                Files.delete(chunkPath);  // Clean up chunk
            }
        }

        sessions.remove(uploadId);
        return fileId;
    }

    public UploadStatus getStatus(String uploadId) {
        UploadSession session = sessions.get(uploadId);
        if (session == null) {
            return null;
        }

        List<Integer> missing = new ArrayList<>();
        for (int i = 0; i < session.receivedChunks.length; i++) {
            if (!session.receivedChunks[i]) {
                missing.add(i);
            }
        }

        return new UploadStatus(session.totalChunks, missing);
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return dotIndex > 0 ? filename.substring(dotIndex) : "";
    }

    private static class UploadSession {
        String filename;
        long totalSize;
        int totalChunks;
        boolean[] receivedChunks;
        Instant createdAt;
    }
}
```

---

## Handling Timeouts

Large uploads take time. Configure your server to wait:

```java
// WebServerConfig.java
@Configuration
public class WebServerConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> customizer() {
        return factory -> factory.addConnectorCustomizers(connector -> {
            // 30 minutes for upload timeout
            connector.setProperty("connectionTimeout", "1800000");
        });
    }
}
```

If you're behind a proxy like nginx, configure it too:

```nginx
# nginx.conf
client_max_body_size 10G;
proxy_read_timeout 1800s;
proxy_send_timeout 1800s;
proxy_connect_timeout 1800s;
```

---

## Progress Tracking

Users hate staring at a spinner. Add progress tracking:

```java
// ProgressTrackingInputStream.java
public class ProgressTrackingInputStream extends FilterInputStream {

    private final long totalBytes;
    private final ProgressListener listener;
    private long bytesRead = 0;

    public ProgressTrackingInputStream(InputStream in, long totalBytes,
            ProgressListener listener) {
        super(in);
        this.totalBytes = totalBytes;
        this.listener = listener;
    }

    @Override
    public int read() throws IOException {
        int b = super.read();
        if (b != -1) {
            bytesRead++;
            reportProgress();
        }
        return b;
    }

    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        int read = super.read(b, off, len);
        if (read != -1) {
            bytesRead += read;
            reportProgress();
        }
        return read;
    }

    private void reportProgress() {
        int percent = (int) ((bytesRead * 100) / totalBytes);
        listener.onProgress(bytesRead, totalBytes, percent);
    }

    public interface ProgressListener {
        void onProgress(long bytesRead, long totalBytes, int percent);
    }
}
```

---

## Best Practices

1. **Validate early** - Check file size and type before processing
2. **Use unique filenames** - Never trust user-provided filenames
3. **Set reasonable limits** - Even if you support 10GB, most users need far less
4. **Clean up temporary files** - Schedule a job to remove stale uploads
5. **Add virus scanning** - Scan files before making them available
6. **Monitor disk space** - Alert before your upload directory fills up

---

## Conclusion

Handling large file uploads properly requires thinking about memory, timeouts, and failure recovery. The streaming approach keeps memory usage constant regardless of file size. Chunked uploads add resilience for unreliable connections. Combined with proper configuration and monitoring, you can build an upload system that handles anything users throw at it.

Start with streaming for most use cases. Add chunked uploads when you need resumable uploads or are dealing with very large files over unreliable connections.

---

*Need to monitor your file upload performance? [OneUptime](https://oneuptime.com) provides application monitoring with custom metrics to track upload success rates and durations.*

**Related Reading:**
- [Spring Boot Documentation on File Uploads](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.multipart)
