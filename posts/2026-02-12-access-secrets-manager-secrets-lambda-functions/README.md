# How to Access Secrets Manager Secrets from Lambda Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Secrets Manager, Lambda, Security, Serverless

Description: Learn how to securely retrieve secrets from AWS Secrets Manager in Lambda functions using the SDK, Lambda extensions, and caching strategies for better performance.

---

Lambda functions need secrets - database passwords, API keys, tokens. Hard-coding them in environment variables (even encrypted ones) is a bad practice because anyone with Lambda:GetFunction permission can read them. Secrets Manager is the right place for sensitive configuration, but how you retrieve secrets in Lambda matters a lot for performance and cost.

This guide covers three approaches: direct SDK calls, the Lambda Extension for caching, and environment variable injection. Each has different tradeoffs around latency, cost, and complexity.

## The Simple Approach: Direct SDK Calls

The most straightforward way is calling Secrets Manager directly from your function code. Here's how it looks in Python and Node.js.

This Python example retrieves a database secret and uses it to connect.

```python
import boto3
import json
import psycopg2

sm_client = boto3.client('secretsmanager')

def get_secret(secret_name):
    """Retrieve a secret from Secrets Manager."""
    response = sm_client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])


def lambda_handler(event, context):
    # Retrieve database credentials
    creds = get_secret('production/database/app')

    # Connect to the database
    conn = psycopg2.connect(
        host=creds['host'],
        port=creds['port'],
        dbname=creds['dbname'],
        user=creds['username'],
        password=creds['password']
    )

    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM users")
    result = cursor.fetchone()

    conn.close()

    return {
        'statusCode': 200,
        'body': json.dumps({'user_count': result[0]})
    }
```

And the same thing in Node.js.

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const smClient = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName) {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await smClient.send(command);
    return JSON.parse(response.SecretString);
}

exports.handler = async (event) => {
    const creds = await getSecret('production/database/app');

    // Use the credentials to connect to your service
    console.log(`Connecting to ${creds.host} as ${creds.username}`);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Connected successfully' })
    };
};
```

The problem with this approach? Every cold start makes a Secrets Manager API call, adding 50-200ms of latency. For warm invocations, you can cache the secret in a module-level variable, but that means the secret lives in memory between invocations.

## Caching Secrets Properly

For production Lambda functions, you want to cache secrets to avoid repeated API calls. Here's a pattern that caches with a configurable TTL.

```python
import boto3
import json
import time
import os

sm_client = boto3.client('secretsmanager')

# Module-level cache - persists between warm invocations
_cache = {}
CACHE_TTL = int(os.environ.get('SECRET_CACHE_TTL', '300'))  # 5 minutes default


def get_cached_secret(secret_name):
    """Retrieve a secret with local caching."""
    now = time.time()

    if secret_name in _cache:
        entry = _cache[secret_name]
        if now - entry['fetched_at'] < CACHE_TTL:
            return entry['value']

    # Cache miss or expired - fetch from Secrets Manager
    response = sm_client.get_secret_value(SecretId=secret_name)
    secret_value = json.loads(response['SecretString'])

    _cache[secret_name] = {
        'value': secret_value,
        'fetched_at': now
    }

    return secret_value


# Pre-warm the cache during init (outside the handler)
# This runs once per cold start
DB_SECRET = get_cached_secret('production/database/app')


def lambda_handler(event, context):
    # Use the cached secret
    creds = get_cached_secret('production/database/app')

    # ... your business logic
    return {'statusCode': 200}
```

The key optimization here is fetching the secret during module initialization (outside the handler). This runs during the cold start's init phase, which has its own timeout separate from the handler timeout.

## Using the AWS Parameters and Secrets Lambda Extension

AWS provides a Lambda extension that handles caching for you. It runs as a local HTTP server on port 2773, and your function fetches secrets through it instead of calling Secrets Manager directly.

The extension caches secrets automatically and handles refreshing when rotation occurs.

First, add the extension layer to your Lambda function.

```bash
# Add the extension layer (use the correct ARN for your region)
aws lambda update-function-configuration \
  --function-name my-function \
  --layers "arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11"
```

Then update your function code to use the local HTTP endpoint.

```python
import urllib.request
import json
import os

# The extension provides this token
AWS_SESSION_TOKEN = os.environ['AWS_SESSION_TOKEN']
SECRETS_EXTENSION_URL = 'http://localhost:2773/secretsmanager/get'

def get_secret_via_extension(secret_name):
    """Retrieve a secret through the Lambda extension."""
    url = f"{SECRETS_EXTENSION_URL}?secretId={secret_name}"

    request = urllib.request.Request(url)
    request.add_header('X-Aws-Parameters-Secrets-Token', AWS_SESSION_TOKEN)

    response = urllib.request.urlopen(request)
    result = json.loads(response.read())

    return json.loads(result['SecretString'])


def lambda_handler(event, context):
    creds = get_secret_via_extension('production/database/app')

    return {
        'statusCode': 200,
        'body': json.dumps({'host': creds['host']})
    }
```

The extension adds about 50MB to your function's memory usage and a small amount of cold start time, but it simplifies caching significantly. It's worth it for functions that access multiple secrets.

## IAM Permissions

Your Lambda execution role needs permission to access Secrets Manager.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSecretAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/database/*"
      ]
    },
    {
      "Sid": "AllowKMSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:123456789012:key/KEY_ID"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

Don't forget the KMS permission. Secrets Manager encrypts secrets with KMS, so your Lambda needs to decrypt them.

## Terraform Setup

Here's a complete Terraform configuration for a Lambda function with Secrets Manager access.

```hcl
# Lambda execution role
resource "aws_iam_role" "lambda" {
  name = "lambda-with-secrets"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Secrets Manager access policy
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.db_creds.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = [aws_kms_key.secrets.arn]
      }
    ]
  })
}

# Lambda function with the extension layer
resource "aws_lambda_function" "app" {
  filename         = "function.zip"
  function_name    = "my-app-function"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  layers = [
    "arn:aws:lambda:${data.aws_region.current.name}:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11"
  ]

  environment {
    variables = {
      SECRET_NAME     = aws_secretsmanager_secret.db_creds.name
      SECRET_CACHE_TTL = "300"
    }
  }
}
```

## VPC Considerations

If your Lambda runs in a VPC (common when accessing RDS), it needs a VPC endpoint to reach Secrets Manager since there's no internet access by default.

```hcl
# VPC endpoint for Secrets Manager
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id             = var.vpc_id
  service_name       = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  private_dns_enabled = true
}
```

Without this endpoint, Secrets Manager calls from VPC-attached Lambdas will timeout.

## Error Handling and Fallbacks

Production code should handle Secrets Manager failures gracefully.

```python
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger()

def get_secret_safe(secret_name):
    """Retrieve a secret with proper error handling."""
    try:
        return get_cached_secret(secret_name)
    except ClientError as e:
        error_code = e.response['Error']['Code']

        if error_code == 'ResourceNotFoundException':
            logger.error(f"Secret {secret_name} not found")
            raise
        elif error_code == 'AccessDeniedException':
            logger.error(f"No permission to access {secret_name}")
            raise
        elif error_code == 'DecryptionFailureException':
            logger.error(f"Cannot decrypt secret {secret_name} - check KMS permissions")
            raise
        else:
            logger.error(f"Unexpected error retrieving {secret_name}: {e}")
            # Fall back to cached value if available
            if secret_name in _cache:
                logger.warning("Using stale cached value")
                return _cache[secret_name]['value']
            raise
```

For more on secret rotation, see our guide on [automatic secret rotation](https://oneuptime.com/blog/post/rotate-secrets-automatically-secrets-manager/view). And if you're running containers instead of Lambda, check out [accessing secrets from ECS](https://oneuptime.com/blog/post/access-secrets-manager-secrets-ecs-tasks/view).

## Wrapping Up

The right approach depends on your function's usage pattern. For simple, low-traffic functions, direct SDK calls with manual caching work fine. For anything in production with consistent traffic, the Lambda Extension is the best option since it handles caching, refresh, and rotation automatically. Either way, always scope IAM permissions tightly to just the secrets your function needs, and don't forget the KMS decrypt permission.
