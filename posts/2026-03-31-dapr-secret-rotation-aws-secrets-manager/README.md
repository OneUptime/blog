# How to Implement Secret Rotation with Dapr and AWS Secrets Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, AWS, Security, Rotation

Description: Learn how to implement secret rotation using Dapr's AWS Secrets Manager integration, including Lambda-based rotation functions and application-side cache invalidation.

---

## AWS Secrets Manager with Dapr

AWS Secrets Manager provides built-in secret rotation using Lambda functions. Dapr's AWS Secrets Manager secret store always reads the latest active version of a secret. By combining automatic rotation in Secrets Manager with application-side polling or event-driven refresh, you can implement zero-downtime credential rotation.

## Dapr Secret Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secrets
  namespace: default
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    value: ""     # Use IAM role / pod identity instead
  - name: secretKey
    value: ""
  - name: sessionToken
    value: ""
```

For EKS with IAM Roles for Service Accounts (IRSA):

```yaml
# ServiceAccount annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/AppSecretsRole
```

## Reading Secrets in Application Code

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

type DBCredentials struct {
    Username string `json:"username"`
    Password string `json:"password"`
    Host     string `json:"host"`
    Port     string `json:"port"`
    DBName   string `json:"dbname"`
}

func getCredentials(ctx context.Context, client dapr.Client) (*DBCredentials, error) {
    secret, err := client.GetSecret(ctx, "aws-secrets", "prod/myapp/db", nil)
    if err != nil {
        return nil, fmt.Errorf("failed to get secret: %w", err)
    }

    return &DBCredentials{
        Username: secret["username"],
        Password: secret["password"],
        Host:     secret["host"],
        Port:     secret["port"],
        DBName:   secret["dbname"],
    }, nil
}
```

## Configuring Automatic Rotation in Secrets Manager

```bash
# Enable rotation for an existing secret
aws secretsmanager rotate-secret \
  --secret-id prod/myapp/db \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789:function:RotateDBSecret \
  --rotation-rules AutomaticallyAfterDays=30

# Or create a secret with rotation from the start
aws secretsmanager create-secret \
  --name prod/myapp/db \
  --secret-string '{"username":"appuser","password":"initial","host":"db.example.com"}' \
  --add-replica-regions Region=us-west-2
```

## Lambda Rotation Function

AWS Secrets Manager calls a Lambda function with four lifecycle steps: `createSecret`, `setSecret`, `testSecret`, `finishSecret`:

```python
import boto3
import json
import secrets
import string

def lambda_handler(event, context):
    step = event['Step']
    secret_id = event['SecretId']
    token = event['ClientRequestToken']

    client = boto3.client('secretsmanager')

    if step == 'createSecret':
        # Generate a new password using cryptographically secure randomness
        alphabet = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for _ in range(32))
        try:
            client.get_secret_value(SecretId=secret_id, VersionId=token, VersionStage='AWSPENDING')
        except client.exceptions.ResourceNotFoundException:
            current = json.loads(client.get_secret_value(SecretId=secret_id, VersionStage='AWSCURRENT')['SecretString'])
            current['password'] = new_password
            client.put_secret_value(
                SecretId=secret_id,
                ClientRequestToken=token,
                SecretString=json.dumps(current),
                VersionStages=['AWSPENDING'],
            )

    elif step == 'setSecret':
        # Apply the new password to the database
        pending = json.loads(client.get_secret_value(SecretId=secret_id, VersionId=token, VersionStage='AWSPENDING')['SecretString'])
        update_database_password(pending['username'], pending['password'], pending['host'])

    elif step == 'testSecret':
        # Verify the new credentials work
        pending = json.loads(client.get_secret_value(SecretId=secret_id, VersionId=token, VersionStage='AWSPENDING')['SecretString'])
        test_db_connection(pending)

    elif step == 'finishSecret':
        # Promote AWSPENDING to AWSCURRENT
        metadata = client.describe_secret(SecretId=secret_id)
        for version_id, stages in metadata['VersionIdsToStages'].items():
            if 'AWSCURRENT' in stages:
                client.update_secret_version_stage(
                    SecretId=secret_id,
                    VersionStage='AWSCURRENT',
                    MoveToVersionId=token,
                    RemoveFromVersionId=version_id,
                )
                break
```

## Application-Side Rotation Handling

Poll for secret changes in the background and refresh connections:

```go
func watchSecretRotation(ctx context.Context, client dapr.Client, interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    var currentHash string

    for {
        select {
        case <-ticker.C:
            creds, err := getCredentials(ctx, client)
            if err != nil {
                log.Printf("Error fetching credentials: %v", err)
                continue
            }
            newHash := hashCredentials(creds)
            if newHash != currentHash {
                log.Println("Credentials rotated, refreshing connection pool")
                refreshConnectionPool(creds)
                currentHash = newHash
            }
        case <-ctx.Done():
            return
        }
    }
}
```

## Summary

Dapr with AWS Secrets Manager enables automatic secret rotation using Lambda rotation functions that follow the four-step rotation lifecycle. Application code reads secrets through Dapr's secret store API, always receiving the current version. Implement a background watcher to detect rotation events and refresh database connection pools without restarting your service.
