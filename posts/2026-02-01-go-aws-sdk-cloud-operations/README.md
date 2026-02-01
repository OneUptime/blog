# How to Use Go with AWS SDK for Cloud Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, AWS, AWS SDK, Cloud, S3, DynamoDB, Lambda

Description: A practical guide to using the AWS SDK for Go v2 to interact with AWS services like S3, DynamoDB, and Lambda.

---

Go has become a popular choice for building cloud-native applications, and for good reason. Its compiled nature, strong concurrency primitives, and minimal runtime overhead make it an excellent fit for AWS workloads. Whether you're building Lambda functions, processing S3 objects, or managing DynamoDB tables, the AWS SDK for Go v2 provides a clean, idiomatic way to interact with AWS services.

This guide walks through practical examples of using the AWS SDK for Go v2. We'll cover configuration, common operations across multiple services, and patterns that will save you debugging time in production.

## Setting Up AWS SDK for Go v2

The AWS SDK for Go v2 is a complete rewrite of the original SDK, designed with modularity in mind. Instead of pulling in a massive dependency, you only import the services you need.

Start by initializing a Go module and installing the core SDK along with the services you plan to use:

```bash
go mod init your-project
go get github.com/aws/aws-sdk-go-v2
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/service/s3
go get github.com/aws/aws-sdk-go-v2/service/dynamodb
go get github.com/aws/aws-sdk-go-v2/service/lambda
```

The `config` package handles loading credentials and configuration - you'll use it in every application that talks to AWS.

## Credential Configuration

AWS SDK v2 follows a credential chain that checks multiple sources in order. Understanding this chain helps you avoid the classic "credential not found" errors.

The following code demonstrates loading the default AWS configuration, which automatically checks environment variables, shared credentials file, and IAM roles:

```go
package main

import (
    "context"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
)

func main() {
    // LoadDefaultConfig checks credentials in this order:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. Shared credentials file (~/.aws/credentials)
    // 3. IAM role (when running on EC2, ECS, or Lambda)
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        log.Fatalf("unable to load SDK config: %v", err)
    }

    log.Printf("Loaded config for region: %s", cfg.Region)
}
```

For applications that need to target a specific region or profile, you can pass functional options:

```go
// Load configuration with explicit region and profile
// Useful for multi-region deployments or local development with named profiles
cfg, err := config.LoadDefaultConfig(context.TODO(),
    config.WithRegion("us-west-2"),
    config.WithSharedConfigProfile("production"),
)
```

When running locally, most developers use the shared credentials file at `~/.aws/credentials`. In production on AWS infrastructure, the SDK automatically picks up IAM role credentials - no code changes required.

## Working with S3

S3 is usually the first service developers integrate. Let's cover the operations you'll use most frequently.

### Creating an S3 Client

Each AWS service has its own client. Create it once and reuse it throughout your application:

```go
package main

import (
    "context"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        log.Fatalf("unable to load SDK config: %v", err)
    }

    // Create an S3 client from the loaded configuration
    // The client is safe for concurrent use across goroutines
    client := s3.NewFromConfig(cfg)

    // Use the client for S3 operations
    _ = client
}
```

### Uploading Objects

Uploading files to S3 is straightforward. The SDK handles chunking for large files automatically:

```go
package main

import (
    "context"
    "log"
    "os"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func uploadFile(client *s3.Client, bucket, key, filePath string) error {
    // Open the file for reading
    file, err := os.Open(filePath)
    if err != nil {
        return err
    }
    defer file.Close()

    // PutObject uploads the file content to S3
    // The Body field accepts any io.Reader, making it flexible for various data sources
    _, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
        Bucket: &bucket,
        Key:    &key,
        Body:   file,
    })
    return err
}

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := s3.NewFromConfig(cfg)

    err := uploadFile(client, "my-bucket", "uploads/data.json", "./local-data.json")
    if err != nil {
        log.Fatalf("upload failed: %v", err)
    }
    log.Println("Upload successful")
}
```

### Downloading Objects

Reading objects follows a similar pattern. Remember to close the response body to avoid resource leaks:

```go
package main

import (
    "context"
    "io"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func downloadFile(client *s3.Client, bucket, key string) ([]byte, error) {
    // GetObject returns a response with a Body that must be closed after reading
    result, err := client.GetObject(context.TODO(), &s3.GetObjectInput{
        Bucket: &bucket,
        Key:    &key,
    })
    if err != nil {
        return nil, err
    }
    // Always close the body to release the HTTP connection back to the pool
    defer result.Body.Close()

    // Read all content into memory
    // For large files, consider streaming directly to disk instead
    return io.ReadAll(result.Body)
}
```

### Listing Objects with Pagination

S3 returns results in pages of up to 1000 objects. The SDK v2 provides paginators that handle this automatically:

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func listAllObjects(client *s3.Client, bucket, prefix string) ([]string, error) {
    var keys []string

    // NewListObjectsV2Paginator automatically handles pagination
    // Each call to NextPage fetches the next batch of results
    paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
        Bucket: &bucket,
        Prefix: &prefix,
    })

    // HasMorePages returns true while there are more results to fetch
    for paginator.HasMorePages() {
        page, err := paginator.NextPage(context.TODO())
        if err != nil {
            return nil, err
        }

        // Process each object in the current page
        for _, obj := range page.Contents {
            keys = append(keys, *obj.Key)
        }
    }

    return keys, nil
}

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := s3.NewFromConfig(cfg)

    keys, err := listAllObjects(client, "my-bucket", "uploads/")
    if err != nil {
        log.Fatalf("list failed: %v", err)
    }
    fmt.Printf("Found %d objects\n", len(keys))
}
```

## DynamoDB Basics

DynamoDB requires a slightly different mental model than S3. You're working with items (rows) in tables, and you need to understand partition keys and sort keys.

### Creating a DynamoDB Client and Putting Items

The SDK uses strongly-typed attribute values. The `attributevalue` package helps marshal Go structs to DynamoDB format:

```go
package main

import (
    "context"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// User represents an item in our DynamoDB table
// The dynamodbav tags map struct fields to DynamoDB attribute names
type User struct {
    UserID    string `dynamodbav:"user_id"`
    Email     string `dynamodbav:"email"`
    Name      string `dynamodbav:"name"`
    CreatedAt int64  `dynamodbav:"created_at"`
}

func putUser(client *dynamodb.Client, tableName string, user User) error {
    // MarshalMap converts a Go struct to a map of DynamoDB attribute values
    // This handles type conversion automatically (string to S, int to N, etc.)
    item, err := attributevalue.MarshalMap(user)
    if err != nil {
        return err
    }

    // PutItem writes the item to the table
    // If an item with the same key exists, it will be overwritten
    _, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
        TableName: &tableName,
        Item:      item,
    })
    return err
}

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := dynamodb.NewFromConfig(cfg)

    user := User{
        UserID:    "user-123",
        Email:     "alice@example.com",
        Name:      "Alice",
        CreatedAt: 1706832000,
    }

    if err := putUser(client, "users", user); err != nil {
        log.Fatalf("put item failed: %v", err)
    }
    log.Println("User saved successfully")
}
```

### Querying Items

Querying is more efficient than scanning because it uses indexes. Always prefer queries when possible:

```go
package main

import (
    "context"
    "log"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

func getUserByID(client *dynamodb.Client, tableName, userID string) (*User, error) {
    // GetItem retrieves a single item by its primary key
    // This is the most efficient way to read a known item
    result, err := client.GetItem(context.TODO(), &dynamodb.GetItemInput{
        TableName: &tableName,
        Key: map[string]types.AttributeValue{
            "user_id": &types.AttributeValueMemberS{Value: userID},
        },
    })
    if err != nil {
        return nil, err
    }

    // Check if the item was found
    if result.Item == nil {
        return nil, nil
    }

    // UnmarshalMap converts DynamoDB attributes back to a Go struct
    var user User
    if err := attributevalue.UnmarshalMap(result.Item, &user); err != nil {
        return nil, err
    }

    return &user, nil
}
```

## Error Handling

AWS operations fail for many reasons - network issues, throttling, permission errors. The SDK v2 provides typed errors you can check:

```go
package main

import (
    "context"
    "errors"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/service/s3/types"
    "github.com/aws/smithy-go"
)

func checkBucketExists(client *s3.Client, bucket string) (bool, error) {
    _, err := client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
        Bucket: &bucket,
    })
    if err != nil {
        // Check for specific error types using errors.As
        var notFound *types.NotFound
        if errors.As(err, &notFound) {
            return false, nil
        }

        // Check for API errors with specific codes
        var apiErr smithy.APIError
        if errors.As(err, &apiErr) {
            log.Printf("API error code: %s, message: %s", apiErr.ErrorCode(), apiErr.ErrorMessage())
        }

        return false, err
    }
    return true, nil
}

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := s3.NewFromConfig(cfg)

    exists, err := checkBucketExists(client, "my-bucket")
    if err != nil {
        log.Fatalf("check failed: %v", err)
    }
    log.Printf("Bucket exists: %v", exists)
}
```

For retryable errors like throttling, the SDK automatically retries with exponential backoff. You can customize this behavior:

```go
package main

import (
    "context"
    "time"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/aws/retry"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
    // Configure custom retry behavior for high-throughput applications
    cfg, _ := config.LoadDefaultConfig(context.TODO(),
        config.WithRetryer(func() aws.Retryer {
            return retry.NewStandard(func(o *retry.StandardOptions) {
                // Increase max attempts for better resilience
                o.MaxAttempts = 5
                // Add jitter to prevent thundering herd
                o.MaxBackoff = 30 * time.Second
            })
        }),
    )

    client := s3.NewFromConfig(cfg)
    _ = client
}
```

## Using Context for Timeouts and Cancellation

Every SDK operation accepts a context as its first argument. Use this to implement timeouts and cancellation:

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func listBucketsWithTimeout(client *s3.Client, timeout time.Duration) error {
    // Create a context with a timeout
    // The operation will be cancelled if it exceeds the timeout
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel() // Always call cancel to release resources

    result, err := client.ListBuckets(ctx, &s3.ListBucketsInput{})
    if err != nil {
        // Check if the error was due to context cancellation
        if ctx.Err() == context.DeadlineExceeded {
            log.Println("Operation timed out")
        }
        return err
    }

    log.Printf("Found %d buckets", len(result.Buckets))
    return nil
}

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := s3.NewFromConfig(cfg)

    // Set a 5-second timeout for the operation
    if err := listBucketsWithTimeout(client, 5*time.Second); err != nil {
        log.Fatalf("list buckets failed: %v", err)
    }
}
```

Context cancellation is especially useful in HTTP handlers where you want to stop AWS operations when the client disconnects:

```go
package main

import (
    "net/http"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func handleRequest(client *s3.Client) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // r.Context() is cancelled when the client disconnects
        // This automatically cancels any in-flight AWS operations
        result, err := client.ListBuckets(r.Context(), &s3.ListBucketsInput{})
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        // Process result...
        _ = result
    }
}
```

## Invoking Lambda Functions

When your Go application needs to call other Lambda functions, the SDK makes it straightforward:

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/lambda"
)

type ProcessRequest struct {
    OrderID string `json:"order_id"`
    Action  string `json:"action"`
}

type ProcessResponse struct {
    Status  string `json:"status"`
    Message string `json:"message"`
}

func invokeProcessor(client *lambda.Client, functionName string, req ProcessRequest) (*ProcessResponse, error) {
    // Marshal the request payload to JSON
    payload, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    // Invoke calls the Lambda function synchronously
    // Use InvocationType to switch between sync and async invocation
    result, err := client.Invoke(context.TODO(), &lambda.InvokeInput{
        FunctionName: &functionName,
        Payload:      payload,
    })
    if err != nil {
        return nil, err
    }

    // Check for function errors (errors thrown by the Lambda code itself)
    if result.FunctionError != nil {
        log.Printf("Function error: %s", *result.FunctionError)
    }

    // Unmarshal the response
    var resp ProcessResponse
    if err := json.Unmarshal(result.Payload, &resp); err != nil {
        return nil, err
    }

    return &resp, nil
}
```

## Best Practices Summary

After working with the AWS SDK for Go in production, here are patterns that consistently help:

1. **Reuse clients** - Create clients once at startup. They're safe for concurrent use and maintain connection pools.

2. **Always pass context** - Even if you don't need cancellation now, threading context through your code makes it easy to add timeouts later.

3. **Use paginators** - Don't write manual pagination loops. The built-in paginators handle edge cases you might miss.

4. **Handle errors specifically** - Use `errors.As` to check for typed errors. Generic error handling hides important information.

5. **Set reasonable timeouts** - AWS operations can hang during network issues. Timeouts prevent goroutine leaks.

6. **Use attribute marshaling** - For DynamoDB, the `attributevalue` package saves significant boilerplate and reduces bugs.

7. **Profile locally with LocalStack** - You can point the SDK at LocalStack for local development without incurring AWS costs.

The AWS SDK for Go v2 strikes a good balance between control and convenience. Its modular design keeps binaries small, and the consistent patterns across services make it quick to add new integrations once you've learned one.

---

*Monitor your AWS-based Go applications with [OneUptime](https://oneuptime.com) - track performance, errors, and cloud costs.*
