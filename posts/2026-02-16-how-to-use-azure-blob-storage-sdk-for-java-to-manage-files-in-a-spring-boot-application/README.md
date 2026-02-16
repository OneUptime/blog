# How to Use Azure Blob Storage SDK for Java to Manage Files in a Spring Boot Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Blob Storage, Java SDK, Spring Boot, File Upload, Cloud Storage, Azure Storage, REST API

Description: Learn how to use the Azure Blob Storage SDK for Java to upload, download, list, and manage files in a Spring Boot application with REST endpoints.

---

Azure Blob Storage is the object storage service in Azure. It is where you store files, images, documents, backups, and any other unstructured data. The Java SDK for Blob Storage provides a fluent API for uploading, downloading, listing, and managing blobs. When you combine it with Spring Boot, you get a clean REST API for file management backed by highly durable cloud storage.

In this post, we will build a Spring Boot application that provides a file management REST API using Azure Blob Storage as the backend. We will cover upload, download, listing, deletion, and generating temporary access URLs.

## Setting Up Azure Blob Storage

Create a storage account and container through the Azure CLI.

```bash
# Create a resource group
az group create --name storage-demo-rg --location eastus

# Create a storage account
az storage account create \
  --name myfilestorage \
  --resource-group storage-demo-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create a blob container
az storage container create \
  --name documents \
  --account-name myfilestorage \
  --public-access off

# Get the connection string
az storage account show-connection-string \
  --name myfilestorage \
  --resource-group storage-demo-rg \
  --output tsv
```

## Project Dependencies

Add the Azure Blob Storage SDK and Spring Boot web starter to your project.

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Azure Blob Storage SDK -->
    <dependency>
        <groupId>com.azure</groupId>
        <artifactId>azure-storage-blob</artifactId>
        <version>12.25.0</version>
    </dependency>

    <!-- Azure Identity for token-based auth (optional but recommended) -->
    <dependency>
        <groupId>com.azure</groupId>
        <artifactId>azure-identity</artifactId>
        <version>1.11.1</version>
    </dependency>
</dependencies>
```

## Configuring the Blob Storage Client

Create a configuration class that sets up the BlobServiceClient as a Spring bean.

```java
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AzureStorageConfig {

    @Value("${azure.storage.connection-string}")
    private String connectionString;

    @Value("${azure.storage.container-name}")
    private String containerName;

    // Create a singleton BlobServiceClient - thread-safe and reusable
    @Bean
    public BlobServiceClient blobServiceClient() {
        return new BlobServiceClientBuilder()
            .connectionString(connectionString)
            .buildClient();
    }

    // Create a client for the specific container we work with
    @Bean
    public BlobContainerClient blobContainerClient(BlobServiceClient serviceClient) {
        BlobContainerClient containerClient = serviceClient.getBlobContainerClient(containerName);

        // Create the container if it does not exist
        if (!containerClient.exists()) {
            containerClient.create();
        }

        return containerClient;
    }
}
```

```yaml
# application.yml
azure:
  storage:
    connection-string: DefaultEndpointsProtocol=https;AccountName=myfilestorage;AccountKey=your-key;EndpointSuffix=core.windows.net
    container-name: documents

# File upload limits
spring:
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB
```

## Building the File Service

Create a service class that encapsulates all blob storage operations.

```java
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.BlobProperties;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private final BlobContainerClient containerClient;

    public FileStorageService(BlobContainerClient containerClient) {
        this.containerClient = containerClient;
    }

    // Upload a file to blob storage
    public FileInfo uploadFile(MultipartFile file, String folder) throws IOException {
        // Generate a unique blob name to avoid collisions
        String originalName = file.getOriginalFilename();
        String blobName = folder + "/" + UUID.randomUUID() + "-" + originalName;

        log.info("Uploading file: {} as blob: {}", originalName, blobName);

        // Get a reference to the blob
        BlobClient blobClient = containerClient.getBlobClient(blobName);

        // Upload the file data with content type
        blobClient.upload(file.getInputStream(), file.getSize(), true);

        // Set the content type based on the file
        blobClient.setHttpHeaders(
            new com.azure.storage.blob.models.BlobHttpHeaders()
                .setContentType(file.getContentType()));

        log.info("File uploaded successfully: {}", blobName);

        return new FileInfo(blobName, originalName, file.getSize(), blobClient.getBlobUrl());
    }

    // Download a file as bytes
    public byte[] downloadFile(String blobName) {
        log.info("Downloading blob: {}", blobName);

        BlobClient blobClient = containerClient.getBlobClient(blobName);

        if (!blobClient.exists()) {
            throw new RuntimeException("File not found: " + blobName);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        blobClient.downloadStream(outputStream);
        return outputStream.toByteArray();
    }

    // List all files in a folder
    public List<FileInfo> listFiles(String prefix) {
        log.info("Listing files with prefix: {}", prefix);

        List<FileInfo> files = new ArrayList<>();

        containerClient.listBlobsByHierarchy(prefix + "/").forEach(blobItem -> {
            if (!blobItem.isPrefix()) {
                BlobClient blobClient = containerClient.getBlobClient(blobItem.getName());
                BlobProperties properties = blobClient.getProperties();

                files.add(new FileInfo(
                    blobItem.getName(),
                    blobItem.getName().substring(blobItem.getName().lastIndexOf('/') + 1),
                    properties.getBlobSize(),
                    blobClient.getBlobUrl()
                ));
            }
        });

        return files;
    }

    // Delete a file
    public void deleteFile(String blobName) {
        log.info("Deleting blob: {}", blobName);

        BlobClient blobClient = containerClient.getBlobClient(blobName);

        if (!blobClient.exists()) {
            throw new RuntimeException("File not found: " + blobName);
        }

        blobClient.delete();
        log.info("Blob deleted: {}", blobName);
    }

    // Generate a temporary download URL (SAS token)
    public String generateDownloadUrl(String blobName, int expiryMinutes) {
        BlobClient blobClient = containerClient.getBlobClient(blobName);

        if (!blobClient.exists()) {
            throw new RuntimeException("File not found: " + blobName);
        }

        // Create SAS token with read permission
        BlobSasPermission permission = new BlobSasPermission().setReadPermission(true);

        BlobServiceSasSignatureValues sasValues = new BlobServiceSasSignatureValues(
            OffsetDateTime.now().plusMinutes(expiryMinutes),
            permission
        );

        String sasToken = blobClient.generateSas(sasValues);
        return blobClient.getBlobUrl() + "?" + sasToken;
    }
}
```

## The FileInfo Response Model

Define a simple model for returning file information.

```java
// Model for file metadata returned by the API
public class FileInfo {
    private String blobName;
    private String fileName;
    private long size;
    private String url;

    public FileInfo(String blobName, String fileName, long size, String url) {
        this.blobName = blobName;
        this.fileName = fileName;
        this.size = size;
        this.url = url;
    }

    // Getters
    public String getBlobName() { return blobName; }
    public String getFileName() { return fileName; }
    public long getSize() { return size; }
    public String getUrl() { return url; }
}
```

## Building the REST Controller

Create a controller that exposes file operations as REST endpoints.

```java
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService storageService;

    public FileController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    // Upload a file to a specified folder
    @PostMapping("/upload")
    public ResponseEntity<FileInfo> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "uploads") String folder)
            throws IOException {

        FileInfo info = storageService.uploadFile(file, folder);
        return ResponseEntity.status(HttpStatus.CREATED).body(info);
    }

    // Upload multiple files at once
    @PostMapping("/upload-multiple")
    public ResponseEntity<List<FileInfo>> uploadMultiple(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "folder", defaultValue = "uploads") String folder)
            throws IOException {

        List<FileInfo> results = new java.util.ArrayList<>();
        for (MultipartFile file : files) {
            results.add(storageService.uploadFile(file, folder));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(results);
    }

    // Download a file
    @GetMapping("/download")
    public ResponseEntity<byte[]> download(@RequestParam("blob") String blobName) {
        byte[] data = storageService.downloadFile(blobName);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + blobName.substring(blobName.lastIndexOf('/') + 1) + "\"")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(data);
    }

    // List files in a folder
    @GetMapping("/list")
    public List<FileInfo> listFiles(
            @RequestParam(value = "folder", defaultValue = "uploads") String folder) {
        return storageService.listFiles(folder);
    }

    // Delete a file
    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam("blob") String blobName) {
        storageService.deleteFile(blobName);
        return ResponseEntity.noContent().build();
    }

    // Generate a temporary download URL
    @GetMapping("/share")
    public ResponseEntity<String> getShareUrl(
            @RequestParam("blob") String blobName,
            @RequestParam(value = "expiry", defaultValue = "60") int expiryMinutes) {
        String url = storageService.generateDownloadUrl(blobName, expiryMinutes);
        return ResponseEntity.ok(url);
    }
}
```

## Testing the API

Use curl to test each endpoint.

```bash
# Upload a file
curl -X POST http://localhost:8080/api/files/upload \
  -F "file=@/path/to/document.pdf" \
  -F "folder=invoices"

# List files in a folder
curl http://localhost:8080/api/files/list?folder=invoices

# Download a file
curl -o downloaded.pdf http://localhost:8080/api/files/download?blob=invoices/abc-document.pdf

# Generate a temporary share URL
curl http://localhost:8080/api/files/share?blob=invoices/abc-document.pdf&expiry=120

# Delete a file
curl -X DELETE http://localhost:8080/api/files?blob=invoices/abc-document.pdf
```

## Large File Uploads

For files larger than a few megabytes, use block uploads to upload in chunks. This is more resilient to network interruptions.

```java
// Upload a large file in blocks
public void uploadLargeFile(String blobName, java.io.InputStream inputStream, long fileSize) {
    BlobClient blobClient = containerClient.getBlobClient(blobName);

    // The SDK automatically uses block uploads for large files
    // Configure the parallel transfer options for better throughput
    com.azure.storage.blob.models.ParallelTransferOptions transferOptions =
        new com.azure.storage.blob.models.ParallelTransferOptions()
            .setBlockSizeLong(4 * 1024 * 1024L)    // 4 MB blocks
            .setMaxConcurrency(4)                     // 4 parallel uploads
            .setMaxSingleUploadSizeLong(8 * 1024 * 1024L);  // Single upload up to 8 MB

    blobClient.uploadWithResponse(
        new com.azure.storage.blob.options.BlobParallelUploadOptions(inputStream, fileSize)
            .setParallelTransferOptions(transferOptions),
        null,  // timeout
        com.azure.core.util.Context.NONE);
}
```

## Storage Tiers and Lifecycle Management

Azure Blob Storage has three access tiers: Hot, Cool, and Archive. Choose based on how often you access the data.

```bash
# Set a blob to cool tier (less frequently accessed)
az storage blob set-tier \
  --account-name myfilestorage \
  --container-name documents \
  --name "archive/old-report.pdf" \
  --tier Cool

# Create a lifecycle management policy to auto-archive old files
az storage account management-policy create \
  --account-name myfilestorage \
  --resource-group storage-demo-rg \
  --policy @lifecycle-policy.json
```

## Wrapping Up

The Azure Blob Storage SDK for Java integrates cleanly with Spring Boot to provide a robust file management backend. The SDK handles connection pooling, retries, and large file uploads automatically. Use connection strings for simple setups or managed identities for production. Generate SAS tokens for temporary access instead of exposing your storage keys. And choose the right storage tier based on access patterns to keep costs down.
