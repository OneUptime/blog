# How to Store Secrets in Parameter Store (SecureString)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, Security, KMS

Description: Learn how to securely store and manage secrets in AWS Systems Manager Parameter Store using SecureString parameters with KMS encryption and IAM access control.

---

Storing secrets in plain text - whether in config files, environment variables, or source code - is a security incident waiting to happen. AWS Systems Manager Parameter Store's SecureString type encrypts your secrets at rest using AWS KMS, gives you fine-grained access control through IAM, and provides an audit trail through CloudTrail.

It's free for standard-tier parameters and doesn't require any infrastructure to manage. Compare that to running your own HashiCorp Vault cluster.

## How SecureString Works

When you store a SecureString parameter, Parameter Store encrypts the value using an AWS KMS key before saving it. When you retrieve the value with the `--with-decryption` flag, Parameter Store calls KMS to decrypt it before returning it to you.

```mermaid
sequenceDiagram
    participant App as Application
    participant SSM as Parameter Store
    participant KMS as AWS KMS

    App->>SSM: PutParameter (SecureString)
    SSM->>KMS: Encrypt value
    KMS-->>SSM: Encrypted ciphertext
    SSM-->>App: Parameter stored

    App->>SSM: GetParameter (WithDecryption=true)
    SSM->>KMS: Decrypt ciphertext
    KMS-->>SSM: Plain text value
    SSM-->>App: Decrypted value
```

## Creating SecureString Parameters

### Using the Default KMS Key

The simplest approach uses the default AWS-managed `aws/ssm` KMS key:

```bash
# Store a database password
aws ssm put-parameter \
  --name "/myapp/production/db-password" \
  --type SecureString \
  --value "super-secret-password-123"

# Store an API key
aws ssm put-parameter \
  --name "/myapp/production/stripe-api-key" \
  --type SecureString \
  --value "sk_live_abc123def456"

# Store a connection string with embedded credentials
aws ssm put-parameter \
  --name "/myapp/production/redis-url" \
  --type SecureString \
  --value "redis://user:password@redis.example.com:6379/0"
```

### Using a Custom KMS Key

For more control over who can decrypt secrets, use a customer-managed KMS key:

```bash
# Create a KMS key for application secrets
KEY_ID=$(aws kms create-key \
  --description "Key for myapp secrets" \
  --query 'KeyMetadata.KeyId' \
  --output text)

aws kms create-alias \
  --alias-name alias/myapp-secrets \
  --target-key-id $KEY_ID

# Store a parameter with the custom key
aws ssm put-parameter \
  --name "/myapp/production/db-password" \
  --type SecureString \
  --value "super-secret-password-123" \
  --key-id alias/myapp-secrets
```

The advantage of a custom key is that you can grant decrypt access separately from Parameter Store read access. An IAM principal needs both `ssm:GetParameter` AND `kms:Decrypt` on the specific key to read the secret.

## KMS Key Policy

When using a custom KMS key, configure the key policy to allow the right principals:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Allow account root full access",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow application role to decrypt",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/myapp-production-role"
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Allow admin role to encrypt and manage",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/secrets-admin-role"
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    }
  ]
}
```

## IAM Policies for Secret Access

Here are IAM policies for different access levels:

Read-only access to secrets for an application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/production/*"
    },
    {
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/key-id-here"
    }
  ]
}
```

Admin access for managing secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter",
        "ssm:DeleteParameter",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:GetParameterHistory",
        "ssm:DescribeParameters"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/key-id-here"
    }
  ]
}
```

## Retrieving Secrets in Applications

### Python

```python
# secrets.py - Retrieve secrets from Parameter Store
import boto3
from functools import lru_cache

ssm = boto3.client('ssm')

@lru_cache(maxsize=None)
def get_secret(name):
    """Get a decrypted secret from Parameter Store.
    Results are cached for the lifetime of the process."""
    response = ssm.get_parameter(
        Name=name,
        WithDecryption=True
    )
    return response['Parameter']['Value']

# Usage
db_password = get_secret('/myapp/production/db-password')
api_key = get_secret('/myapp/production/stripe-api-key')
```

### Node.js

```javascript
// secrets.js - Retrieve secrets from Parameter Store
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const cache = new Map();

async function getSecret(name) {
  // Check cache first
  if (cache.has(name)) {
    return cache.get(name);
  }

  const response = await ssm.send(new GetParameterCommand({
    Name: name,
    WithDecryption: true
  }));

  const value = response.Parameter.Value;
  cache.set(name, value);
  return value;
}

module.exports = { getSecret };
```

### Loading All Secrets for an Environment

```python
# load_env_secrets.py - Load all secrets for an environment
import boto3
import os

def load_secrets_as_env_vars(path):
    """Load all secrets under a path into environment variables."""
    ssm = boto3.client('ssm')
    paginator = ssm.get_paginator('get_parameters_by_path')

    for page in paginator.paginate(
        Path=path,
        Recursive=True,
        WithDecryption=True
    ):
        for param in page['Parameters']:
            # Convert /myapp/production/db-password to DB_PASSWORD
            key = param['Name'].split('/')[-1].upper().replace('-', '_')
            os.environ[key] = param['Value']

# Call at application startup
load_secrets_as_env_vars('/myapp/production')

# Now you can use os.environ
import os
db_password = os.environ['DB_PASSWORD']
```

## Rotating Secrets

Parameter Store doesn't have built-in rotation like Secrets Manager, but you can build it:

```python
# rotate_secret.py - Rotate a database password in Parameter Store
import boto3
import secrets
import string

ssm = boto3.client('ssm')

def rotate_db_password(param_name, db_connection):
    # Generate a new password
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    new_password = ''.join(secrets.choice(alphabet) for _ in range(32))

    # Update the database password first
    db_connection.execute(f"ALTER USER myapp SET PASSWORD = %s", (new_password,))

    # Then update Parameter Store
    ssm.put_parameter(
        Name=param_name,
        Type='SecureString',
        Value=new_password,
        Overwrite=True
    )

    print(f"Rotated password for {param_name}")
```

For automated rotation on a schedule, consider using AWS Secrets Manager instead, which has built-in rotation support. But for secrets that don't need automatic rotation, Parameter Store is simpler and cheaper.

## Auditing Secret Access

Every access to a SecureString parameter is logged in CloudTrail:

```bash
# Search CloudTrail for parameter access events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetParameter \
  --start-time "2026-02-01" \
  --query 'Events[*].{Time:EventTime,User:Username,Event:EventName}'
```

## Using with ECS

Inject secrets into ECS containers without exposing them in task definition plain text:

```json
{
  "containerDefinitions": [{
    "name": "myapp",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
    "secrets": [
      {
        "name": "DB_PASSWORD",
        "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/db-password"
      },
      {
        "name": "API_KEY",
        "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/stripe-api-key"
      }
    ]
  }]
}
```

The task execution role needs:
```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameters"],
  "Resource": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/*"
}
```

## Best Practices

1. **Always use SecureString for sensitive data** - Even if you think it's "not that secret," encrypt it. There's no downside.
2. **Use custom KMS keys for production** - This gives you an extra layer of access control beyond IAM.
3. **Organize by environment** - Use paths like `/app/env/secret-name` to scope access.
4. **Never log decrypted values** - Be careful not to accidentally log secrets in your application.
5. **Version your secrets** - Parameter Store versions automatically. Use `get-parameter-history` to see who changed what.

For monitoring access patterns and detecting unusual secret retrieval, [OneUptime](https://oneuptime.com) can help you build dashboards and alerts around your security events. Also check our guide on [Parameter Store hierarchies](https://oneuptime.com/blog/post/parameter-store-hierarchies-paths/view) for organizing your secrets at scale.
