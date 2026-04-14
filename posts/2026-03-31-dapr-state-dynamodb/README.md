# How to Use Dapr State Management with DynamoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, DynamoDB, AWS, Microservice

Description: Configure Dapr state management with AWS DynamoDB as the backing store for serverless, scalable key-value state storage with pay-per-use pricing.

---

## Why Use DynamoDB as a Dapr State Store?

AWS DynamoDB is a serverless NoSQL database with single-digit millisecond latency and automatic scaling. Using it as a Dapr state store lets you persist application state with no infrastructure to manage, making it ideal for AWS-based microservices architectures.

## Prerequisites

- AWS account with DynamoDB permissions
- AWS CLI configured with access credentials
- Dapr CLI initialized

## Creating the DynamoDB Table

Dapr requires a DynamoDB table with `key` as the partition key (string type):

```bash
aws dynamodb create-table \
  --table-name dapr-statestore \
  --attribute-definitions AttributeName=key,AttributeType=S \
  --key-schema AttributeName=key,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Verify the table is active:

```bash
aws dynamodb describe-table \
  --table-name dapr-statestore \
  --region us-east-1 \
  --query 'Table.TableStatus'
```

## Configuring the DynamoDB State Store Component

```yaml
# statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "dapr-statestore"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

Create the secret on Kubernetes:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Using IAM Roles Instead of Access Keys

For EC2, EKS with IRSA, or ECS with task roles, omit the credentials and use the IAM role:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "dapr-statestore"
  - name: region
    value: "us-east-1"
```

Attach this IAM policy to the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:TransactWriteItems"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/dapr-statestore"
    }
  ]
}
```

## Using the State Store

Save and retrieve state using the standard Dapr API:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "session:user123", "value": {"userId": "user123", "token": "abc"}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/session:user123
```

## Python Example

```python
from dapr.clients import DaprClient
import json

with DaprClient() as client:
    # Save state
    session = {
        "userId": "user123",
        "token": "abc123token",
        "expires": "2026-12-31T00:00:00Z"
    }
    client.save_state(
        store_name="statestore",
        key="session:user123",
        value=json.dumps(session)
    )

    # Get state
    result = client.get_state(
        store_name="statestore",
        key="session:user123"
    )
    if result.data:
        data = json.loads(result.data)
        print(f"Session for {data['userId']}: token={data['token']}")

    # Delete state
    client.delete_state(
        store_name="statestore",
        key="session:user123"
    )
    print("Session deleted")
```

## Go Example

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

type Session struct {
    UserID  string `json:"userId"`
    Token   string `json:"token"`
    Expires string `json:"expires"`
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()
    ctx := context.Background()

    sess := Session{
        UserID:  "user456",
        Token:   "xyz789",
        Expires: "2026-12-31T00:00:00Z",
    }
    data, _ := json.Marshal(sess)

    if err := client.SaveState(ctx, "statestore", "session:user456", data, nil); err != nil {
        log.Fatal(err)
    }

    item, err := client.GetState(ctx, "statestore", "session:user456", nil)
    if err != nil {
        log.Fatal(err)
    }

    var retrieved Session
    json.Unmarshal(item.Value, &retrieved)
    fmt.Printf("User: %s, Token: %s\n", retrieved.UserID, retrieved.Token)
}
```

## DynamoDB Item Structure

Dapr stores each state key as a DynamoDB item with the following structure:

```json
{
  "key": {"S": "myapp||session:user123"},
  "value": {"S": "{\"userId\":\"user123\",\"token\":\"abc123token\"}"},
  "etag": {"S": "\"abc123\""},
  "expirationTime": {"N": "1741234567"}
}
```

The key format is `{app-id}||{user-key}`.

## Enabling TTL

Configure TTL for automatic expiration of state items:

```yaml
  - name: ttlAttributeName
    value: "expirationTime"
```

Enable TTL on the DynamoDB table:

```bash
aws dynamodb update-time-to-live \
  --table-name dapr-statestore \
  --time-to-live-specification Enabled=true,AttributeName=expirationTime
```

Now when you save state with a TTL:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "cache:item1", "value": "data", "metadata": {"ttlInSeconds": "3600"}}]'
```

## Endpoint Configuration for LocalStack

For local testing with LocalStack:

```yaml
  - name: endpoint
    value: "http://localhost:4566"
  - name: region
    value: "us-east-1"
  - name: accessKey
    value: "test"
  - name: secretKey
    value: "test"
```

## Summary

Dapr state management with DynamoDB provides serverless, scalable state storage for AWS-based microservices. The component maps Dapr state keys to DynamoDB items with the app ID as a key prefix. Authentication supports IAM roles (recommended for production) and explicit access keys. All standard Dapr state operations including TTL, optimistic concurrency via ETags, and bulk operations are fully supported.
