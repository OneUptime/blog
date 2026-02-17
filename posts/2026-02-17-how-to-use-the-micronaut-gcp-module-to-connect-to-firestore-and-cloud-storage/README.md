# How to Use the Micronaut GCP Module to Connect to Firestore and Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Micronaut, Firestore, Cloud Storage, Java

Description: Use the Micronaut GCP module to integrate your Micronaut application with Firestore for document storage and Cloud Storage for file management with minimal configuration.

---

Micronaut's GCP module provides auto-configuration for Google Cloud services, making it straightforward to connect to Firestore and Cloud Storage from a Micronaut application. The module handles credential management, client creation, and injection so you can focus on your application logic rather than SDK boilerplate.

In this post, I will walk through building a Micronaut application that uses Firestore for data storage and Cloud Storage for file management.

## Project Setup

Add the Micronaut GCP dependencies to your Gradle build file:

```groovy
// build.gradle
plugins {
    id("io.micronaut.application") version "4.2.1"
}

dependencies {
    // Micronaut GCP common module for credential management
    implementation("io.micronaut.gcp:micronaut-gcp-common")

    // Google Cloud Firestore client
    implementation("com.google.cloud:google-cloud-firestore")

    // Google Cloud Storage client
    implementation("com.google.cloud:google-cloud-storage")

    // Micronaut HTTP server
    implementation("io.micronaut:micronaut-http-server-netty")

    // Serialization
    annotationProcessor("io.micronaut.serde:micronaut-serde-processor")
    implementation("io.micronaut.serde:micronaut-serde-jackson")
}
```

Configure the application in `application.yml`:

```yaml
# application.yml
micronaut:
  application:
    name: gcp-demo
gcp:
  project-id: my-project-id
```

## Configuring the GCP Clients

The Micronaut GCP module auto-detects credentials, but you can also configure the clients explicitly:

```java
// Factory class that creates GCP service clients as beans
@Factory
public class GcpClientFactory {

    @Value("${gcp.project-id}")
    private String projectId;

    // Create a Firestore client bean
    @Singleton
    public Firestore firestore() throws IOException {
        FirestoreOptions options = FirestoreOptions.newBuilder()
                .setProjectId(projectId)
                .build();
        return options.getService();
    }

    // Create a Storage client bean
    @Singleton
    public Storage storage() {
        StorageOptions options = StorageOptions.newBuilder()
                .setProjectId(projectId)
                .build();
        return options.getService();
    }
}
```

## Firestore Document Service

Build a service that performs CRUD operations on Firestore:

```java
@Singleton
public class ArticleService {

    private static final String COLLECTION = "articles";
    private final Firestore firestore;

    // Firestore client is injected from the factory
    public ArticleService(Firestore firestore) {
        this.firestore = firestore;
    }

    // Create a new article document
    public Article create(Article article) throws Exception {
        String id = UUID.randomUUID().toString();
        article.setId(id);
        article.setCreatedAt(Instant.now().toString());

        // Convert to a map and write to Firestore
        Map<String, Object> data = Map.of(
                "id", article.getId(),
                "title", article.getTitle(),
                "content", article.getContent(),
                "author", article.getAuthor(),
                "tags", article.getTags(),
                "createdAt", article.getCreatedAt());

        firestore.collection(COLLECTION).document(id).set(data).get();
        return article;
    }

    // Retrieve an article by ID
    public Optional<Article> findById(String id) throws Exception {
        DocumentSnapshot doc = firestore.collection(COLLECTION).document(id).get().get();

        if (!doc.exists()) {
            return Optional.empty();
        }

        return Optional.of(documentToArticle(doc));
    }

    // List all articles
    public List<Article> findAll() throws Exception {
        QuerySnapshot querySnapshot = firestore.collection(COLLECTION).get().get();

        return querySnapshot.getDocuments().stream()
                .map(this::documentToArticle)
                .collect(Collectors.toList());
    }

    // Query articles by tag
    public List<Article> findByTag(String tag) throws Exception {
        QuerySnapshot querySnapshot = firestore.collection(COLLECTION)
                .whereArrayContains("tags", tag)
                .get()
                .get();

        return querySnapshot.getDocuments().stream()
                .map(this::documentToArticle)
                .collect(Collectors.toList());
    }

    // Update an article
    public Article update(String id, Article updated) throws Exception {
        DocumentReference docRef = firestore.collection(COLLECTION).document(id);

        Map<String, Object> updates = new HashMap<>();
        updates.put("title", updated.getTitle());
        updates.put("content", updated.getContent());
        updates.put("tags", updated.getTags());
        updates.put("updatedAt", Instant.now().toString());

        docRef.update(updates).get();

        return findById(id).orElseThrow();
    }

    // Delete an article
    public void delete(String id) throws Exception {
        firestore.collection(COLLECTION).document(id).delete().get();
    }

    // Convert a Firestore document to an Article object
    private Article documentToArticle(DocumentSnapshot doc) {
        Article article = new Article();
        article.setId(doc.getString("id"));
        article.setTitle(doc.getString("title"));
        article.setContent(doc.getString("content"));
        article.setAuthor(doc.getString("author"));
        article.setTags((List<String>) doc.get("tags"));
        article.setCreatedAt(doc.getString("createdAt"));
        return article;
    }
}
```

## Cloud Storage File Service

Build a service for file operations:

```java
@Singleton
public class FileStorageService {

    private final Storage storage;
    private final String bucketName;

    public FileStorageService(Storage storage,
                              @Value("${gcp.storage.bucket}") String bucketName) {
        this.storage = storage;
        this.bucketName = bucketName;
    }

    // Upload a file to Cloud Storage
    public FileInfo uploadFile(String fileName, byte[] content, String contentType) {
        BlobId blobId = BlobId.of(bucketName, fileName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(contentType)
                .build();

        Blob blob = storage.create(blobInfo, content);

        return new FileInfo(
                blob.getName(),
                blob.getSize(),
                blob.getContentType(),
                String.format("gs://%s/%s", bucketName, fileName));
    }

    // Download a file from Cloud Storage
    public byte[] downloadFile(String fileName) {
        Blob blob = storage.get(BlobId.of(bucketName, fileName));

        if (blob == null) {
            throw new RuntimeException("File not found: " + fileName);
        }

        return blob.getContent();
    }

    // List files in the bucket with an optional prefix
    public List<FileInfo> listFiles(String prefix) {
        Storage.BlobListOption[] options = prefix != null
                ? new Storage.BlobListOption[]{Storage.BlobListOption.prefix(prefix)}
                : new Storage.BlobListOption[]{};

        List<FileInfo> files = new ArrayList<>();
        for (Blob blob : storage.list(bucketName, options).iterateAll()) {
            files.add(new FileInfo(
                    blob.getName(),
                    blob.getSize(),
                    blob.getContentType(),
                    String.format("gs://%s/%s", bucketName, blob.getName())));
        }
        return files;
    }

    // Delete a file
    public boolean deleteFile(String fileName) {
        return storage.delete(BlobId.of(bucketName, fileName));
    }

    // Generate a signed URL for temporary access
    public String generateSignedUrl(String fileName, int expirationMinutes) {
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, fileName)).build();

        URL signedUrl = storage.signUrl(blobInfo,
                expirationMinutes, TimeUnit.MINUTES,
                Storage.SignUrlOption.withV4Signature());

        return signedUrl.toString();
    }
}
```

## Data Models

```java
// Article model for Firestore documents
@Serdeable
public class Article {
    private String id;
    private String title;
    private String content;
    private String author;
    private List<String> tags;
    private String createdAt;

    public Article() {}

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}

// File info returned from storage operations
@Serdeable
public class FileInfo {
    private String name;
    private long size;
    private String contentType;
    private String gsUri;

    public FileInfo(String name, long size, String contentType, String gsUri) {
        this.name = name;
        this.size = size;
        this.contentType = contentType;
        this.gsUri = gsUri;
    }

    // Getters
    public String getName() { return name; }
    public long getSize() { return size; }
    public String getContentType() { return contentType; }
    public String getGsUri() { return gsUri; }
}
```

## REST Controllers

Expose the services through REST endpoints:

```java
@Controller("/api/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @Get
    public List<Article> listArticles(@Nullable @QueryValue String tag) throws Exception {
        if (tag != null) {
            return articleService.findByTag(tag);
        }
        return articleService.findAll();
    }

    @Get("/{id}")
    public HttpResponse<Article> getArticle(String id) throws Exception {
        return articleService.findById(id)
                .map(HttpResponse::ok)
                .orElse(HttpResponse.notFound());
    }

    @Post
    @Status(HttpStatus.CREATED)
    public Article createArticle(@Body Article article) throws Exception {
        return articleService.create(article);
    }

    @Put("/{id}")
    public Article updateArticle(String id, @Body Article article) throws Exception {
        return articleService.update(id, article);
    }

    @Delete("/{id}")
    @Status(HttpStatus.NO_CONTENT)
    public void deleteArticle(String id) throws Exception {
        articleService.delete(id);
    }
}
```

```java
@Controller("/api/files")
public class FileController {

    private final FileStorageService fileService;

    public FileController(FileStorageService fileService) {
        this.fileService = fileService;
    }

    @Post("/upload")
    public HttpResponse<FileInfo> uploadFile(CompletedFileUpload file) throws IOException {
        FileInfo info = fileService.uploadFile(
                file.getFilename(),
                file.getBytes(),
                file.getContentType().orElse("application/octet-stream"));
        return HttpResponse.created(info);
    }

    @Get
    public List<FileInfo> listFiles(@Nullable @QueryValue String prefix) {
        return fileService.listFiles(prefix);
    }

    @Get("/{fileName}/signed-url")
    public Map<String, String> getSignedUrl(String fileName,
                                             @QueryValue(defaultValue = "60") int minutes) {
        String url = fileService.generateSignedUrl(fileName, minutes);
        return Map.of("signedUrl", url, "expiresInMinutes", String.valueOf(minutes));
    }

    @Delete("/{fileName}")
    @Status(HttpStatus.NO_CONTENT)
    public void deleteFile(String fileName) {
        fileService.deleteFile(fileName);
    }
}
```

## Application Configuration

```yaml
# application.yml
micronaut:
  application:
    name: gcp-demo
  server:
    port: ${PORT:8080}
    multipart:
      max-file-size: 50MB
gcp:
  project-id: my-project-id
  storage:
    bucket: my-app-files
```

## Wrapping Up

The Micronaut GCP module makes connecting to Firestore and Cloud Storage simple. The framework handles credential discovery and client lifecycle. Firestore gives you a flexible document database without schema management, and Cloud Storage handles file operations with features like signed URLs for temporary access. The key advantage of using Micronaut over Spring for this is startup time - the compile-time dependency injection means your application starts faster, which matters on serverless platforms like Cloud Run and Cloud Functions.
