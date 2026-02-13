# How to Use the AWS SDK for Java (v2)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Java, SDK

Description: A complete guide to using the AWS SDK for Java v2, covering setup with Maven and Gradle, creating clients, making API calls, async operations, and best practices.

---

The AWS SDK for Java v2 is a major improvement over v1. It's built on non-blocking I/O, has better immutable data models, and supports async operations natively. If you're writing Java applications that interact with AWS, v2 is the way to go. Let's get you set up and running through the essential patterns.

## Adding Dependencies

You can pull in individual service modules instead of the entire SDK. Here's how to set it up with Maven and Gradle.

Maven configuration for the services you need.

```xml
<!-- pom.xml -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>bom</artifactId>
            <version>2.25.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3</artifactId>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>dynamodb</artifactId>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>dynamodb-enhanced</artifactId>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>lambda</artifactId>
    </dependency>
</dependencies>
```

Gradle configuration.

```groovy
// build.gradle
dependencies {
    implementation platform('software.amazon.awssdk:bom:2.25.0')
    implementation 'software.amazon.awssdk:s3'
    implementation 'software.amazon.awssdk:dynamodb'
    implementation 'software.amazon.awssdk:dynamodb-enhanced'
    implementation 'software.amazon.awssdk:lambda'
}
```

## Creating Clients

SDK v2 clients use a builder pattern. Every client is thread-safe and should be reused.

```java
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

public class AwsClients {
    // Create clients once and reuse them
    private static final S3Client s3 = S3Client.builder()
            .region(Region.US_EAST_1)
            .build();

    private static final DynamoDbClient dynamodb = DynamoDbClient.builder()
            .region(Region.US_EAST_1)
            .build();

    public static S3Client s3() { return s3; }
    public static DynamoDbClient dynamodb() { return dynamodb; }
}
```

## S3 Operations

Here are the most common S3 operations with v2.

```java
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.nio.file.Paths;

S3Client s3 = S3Client.builder().region(Region.US_EAST_1).build();

// List buckets
ListBucketsResponse buckets = s3.listBuckets();
buckets.buckets().forEach(b ->
    System.out.println(b.name() + " - " + b.creationDate())
);

// Upload a file
s3.putObject(
    PutObjectRequest.builder()
        .bucket("my-bucket")
        .key("data/report.pdf")
        .contentType("application/pdf")
        .build(),
    Paths.get("report.pdf")
);

// Upload from a string
s3.putObject(
    PutObjectRequest.builder()
        .bucket("my-bucket")
        .key("data/config.json")
        .contentType("application/json")
        .build(),
    RequestBody.fromString("{\"version\": \"1.0\"}")
);

// Download to a file
s3.getObject(
    GetObjectRequest.builder()
        .bucket("my-bucket")
        .key("data/report.pdf")
        .build(),
    ResponseTransformer.toFile(Paths.get("/tmp/report.pdf"))
);

// Download as bytes
byte[] data = s3.getObjectAsBytes(
    GetObjectRequest.builder()
        .bucket("my-bucket")
        .key("data/config.json")
        .build()
).asByteArray();
```

## DynamoDB with the Enhanced Client

The enhanced client maps Java objects to DynamoDB items using annotations.

```java
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.regions.Region;

// Define your data model
@DynamoDbBean
public class User {
    private String userId;
    private String name;
    private String email;
    private int age;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("user_id")
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
}
```

Using the enhanced client to perform CRUD operations.

```java
DynamoDbClient client = DynamoDbClient.builder()
    .region(Region.US_EAST_1).build();
DynamoDbEnhancedClient enhanced = DynamoDbEnhancedClient.builder()
    .dynamoDbClient(client).build();

DynamoDbTable<User> userTable = enhanced.table("users",
    TableSchema.fromBean(User.class));

// Create a user
User user = new User();
user.setUserId("user-123");
user.setName("Alice Johnson");
user.setEmail("alice@example.com");
user.setAge(30);
userTable.putItem(user);

// Get a user
User retrieved = userTable.getItem(
    Key.builder().partitionValue("user-123").build()
);
System.out.println("Name: " + retrieved.getName());

// Query users
QueryConditional query = QueryConditional
    .keyEqualTo(Key.builder().partitionValue("user-123").build());
userTable.query(query).items().forEach(u ->
    System.out.println(u.getName())
);
```

## Async Clients

V2 provides async versions of every client for non-blocking operations.

```java
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.ListBucketsResponse;
import java.util.concurrent.CompletableFuture;

S3AsyncClient s3Async = S3AsyncClient.builder()
    .region(Region.US_EAST_1)
    .build();

// Async call returns a CompletableFuture
CompletableFuture<ListBucketsResponse> future = s3Async.listBuckets();

future.thenAccept(response -> {
    response.buckets().forEach(b ->
        System.out.println("Bucket: " + b.name())
    );
}).exceptionally(error -> {
    System.err.println("Error: " + error.getMessage());
    return null;
}).join();  // block if needed
```

## Pagination

V2 provides automatic pagination through iterable responses.

```java
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.paginators.ListObjectsV2Iterable;

S3Client s3 = S3Client.builder().region(Region.US_EAST_1).build();

// Automatic pagination - iterates through all pages
ListObjectsV2Iterable pages = s3.listObjectsV2Paginator(
    ListObjectsV2Request.builder()
        .bucket("my-bucket")
        .prefix("logs/")
        .build()
);

// Iterate through all objects across all pages
int count = 0;
for (S3Object object : pages.contents()) {
    System.out.println(object.key() + " (" + object.size() + " bytes)");
    count++;
}
System.out.println("Total objects: " + count);
```

## Error Handling

V2 uses service-specific exception classes.

```java
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.core.exception.SdkClientException;

try {
    s3.getObject(GetObjectRequest.builder()
        .bucket("my-bucket")
        .key("nonexistent.txt")
        .build(),
        ResponseTransformer.toBytes());
} catch (NoSuchKeyException e) {
    System.out.println("Object not found");
} catch (NoSuchBucketException e) {
    System.out.println("Bucket not found");
} catch (S3Exception e) {
    // Other S3-specific errors
    System.out.println("S3 error: " + e.awsErrorDetails().errorCode());
    System.out.println("Message: " + e.awsErrorDetails().errorMessage());
    System.out.println("Status: " + e.statusCode());
    System.out.println("Request ID: " + e.requestId());
} catch (SdkClientException e) {
    // Client-side errors (network, credentials, etc.)
    System.out.println("Client error: " + e.getMessage());
}
```

## Configuration Options

Fine-tune client behavior with the builder.

```java
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.retry.RetryPolicy;
import java.time.Duration;
import java.net.URI;

S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .overrideConfiguration(ClientOverrideConfiguration.builder()
        .apiCallTimeout(Duration.ofSeconds(30))
        .apiCallAttemptTimeout(Duration.ofSeconds(10))
        .retryPolicy(RetryPolicy.builder()
            .numRetries(5)
            .build())
        .build())
    .build();

// For local development (LocalStack)
S3Client localS3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .endpointOverride(URI.create("http://localhost:4566"))
    .forcePathStyle(true)
    .build();
```

## Best Practices

- **Reuse clients.** They're thread-safe and expensive to create. Build them once and share them.
- **Use the BOM** for dependency management. It ensures all SDK modules have compatible versions.
- **Prefer the enhanced DynamoDB client** for CRUD operations. It eliminates boilerplate.
- **Close clients when done.** Clients hold resources. Call `close()` or use try-with-resources.
- **Use async clients** for high-throughput applications where blocking isn't acceptable.
- **Import only what you need.** Each service module is a separate dependency.

For details on configuring credentials for your Java clients, see the guide on [AWS SDK Java credentials](https://oneuptime.com/blog/post/2026-02-12-configure-aws-sdk-java-credentials/view). If you're testing locally, [LocalStack](https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view) works great with the Java SDK.
