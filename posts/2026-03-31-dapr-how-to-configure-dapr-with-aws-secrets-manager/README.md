# How to Configure Dapr with AWS Secrets Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Secrets Manager, Security, Microservice

Description: Learn how to configure Dapr to use AWS Secrets Manager as a secret store so your microservices can securely retrieve secrets without hardcoding credentials.

---

## Why Use AWS Secrets Manager with Dapr

AWS Secrets Manager is a managed service for storing, rotating, and auditing secrets. By configuring it as a Dapr secret store, your microservices can retrieve secrets through the Dapr sidecar API using the same interface regardless of the underlying secret backend, making it easy to switch between environments.

## Prerequisites

- An AWS account with Secrets Manager access
- IAM role or credentials with `secretsmanager:GetSecretValue` permission
- Dapr CLI installed and initialized
- Basic familiarity with Dapr components

## Create Secrets in AWS Secrets Manager

```bash
# Create a database connection string secret
aws secretsmanager create-secret \
  --name "myapp/db-connection-string" \
  --description "PostgreSQL connection string" \
  --secret-string "host=mydb.rds.amazonaws.com user=app password=secret dbname=myapp port=5432"

# Create an API key secret
aws secretsmanager create-secret \
  --name "myapp/stripe-api-key" \
  --description "Stripe payment API key" \
  --secret-string "sk_live_xxxxxxxxxxxxxxxx"

# Create a JSON secret with multiple values
aws secretsmanager create-secret \
  --name "myapp/config" \
  --secret-string '{"smtp_host":"smtp.example.com","smtp_port":"587","api_url":"https://api.example.com"}'
```

## Define the AWS Secrets Manager Component

Using IAM role (recommended for EKS with IRSA):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: awssecretmanager
  namespace: default
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
```

Using explicit AWS credentials (for self-hosted or non-IRSA environments):

```yaml
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    value: "AKIAIOSFODNN7EXAMPLE"
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: sessionToken
    value: ""
```

## Grant IAM Permissions

Create an IAM policy that allows reading secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/*"
      ]
    }
  ]
}
```

Attach this policy to your EKS service account (IRSA) or EC2 instance role.

## Read Secrets in Your Application

Via the Dapr HTTP API:

```bash
curl "http://localhost:3500/v1.0/secrets/awssecretmanager/myapp%2Fdb-connection-string"
```

Response:

```json
{
  "myapp/db-connection-string": "host=mydb.rds.amazonaws.com user=app ..."
}
```

## Use Secrets in Node.js

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const SECRET_STORE = 'awssecretmanager';

async function getSecret(secretName) {
  const secret = await client.secret.get(SECRET_STORE, secretName);
  return secret[secretName];
}

async function getJsonSecret(secretName, field) {
  const rawSecret = await getSecret(secretName);
  const parsed = JSON.parse(rawSecret);
  return parsed[field];
}

async function initializeDatabase() {
  const connStr = await getSecret('myapp/db-connection-string');
  const stripeKey = await getSecret('myapp/stripe-api-key');
  const smtpHost = await getJsonSecret('myapp/config', 'smtp_host');

  console.log('Secrets loaded from AWS Secrets Manager');
  // Initialize connections with secrets
}
```

## Use Secrets in Python

```python
from dapr.clients import DaprClient
import json

SECRET_STORE = 'awssecretmanager'

def get_secret(secret_name: str) -> str:
    with DaprClient() as client:
        resp = client.get_secret(
            store_name=SECRET_STORE,
            key=secret_name
        )
        return resp.secret[secret_name]

def get_json_secret(secret_name: str) -> dict:
    raw = get_secret(secret_name)
    return json.loads(raw)

# Load secrets at startup
db_conn = get_secret('myapp/db-connection-string')
config = get_json_secret('myapp/config')

print(f"SMTP Host: {config['smtp_host']}")
```

## Reference Secrets in Dapr Components

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-binding
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.example.com:9092"
  - name: saslPassword
    secretKeyRef:
      name: myapp/kafka-credentials
      key: password
auth:
  secretStore: awssecretmanager
```

## Handle Secret Rotation

AWS Secrets Manager supports automatic rotation. When a secret is rotated, the next call to the Dapr secrets API will retrieve the updated value from AWS Secrets Manager. Design your application to re-fetch secrets periodically rather than caching them indefinitely, so that rotated credentials are picked up promptly.

## Summary

Configuring Dapr with AWS Secrets Manager provides secure, centralized secret management for microservices deployed on AWS. With IRSA for EKS, applications access secrets without any credentials in code or configuration, while Dapr's uniform secret API keeps your application code portable across AWS, Azure, and other cloud providers.
