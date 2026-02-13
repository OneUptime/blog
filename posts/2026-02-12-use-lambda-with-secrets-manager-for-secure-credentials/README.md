# How to Use Lambda with Secrets Manager for Secure Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Secrets Manager, Security, Serverless

Description: Securely store and retrieve database passwords, API keys, and other secrets in AWS Lambda functions using Secrets Manager with caching and rotation.

---

Hardcoding secrets in Lambda environment variables is a common mistake. Environment variables are visible in the Lambda console, show up in CloudFormation templates, and get logged if you're not careful. AWS Secrets Manager provides a proper secret store that encrypts credentials at rest, controls access through IAM, supports automatic rotation, and keeps an audit trail.

Let's set up Lambda to securely retrieve secrets from Secrets Manager, with caching to avoid calling the API on every invocation.

## Creating a Secret

First, store your credentials in Secrets Manager:

```bash
# Create a secret for database credentials
aws secretsmanager create-secret \
  --name "myapp/production/db-credentials" \
  --description "Production database credentials" \
  --secret-string '{
    "username": "app_user",
    "password": "super-secret-password-123",
    "engine": "postgres",
    "host": "mydb.cluster-abc123.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "myapp"
  }'
```

You can also store simpler secrets:

```bash
# Store an API key
aws secretsmanager create-secret \
  --name "myapp/production/stripe-api-key" \
  --secret-string "sk_live_abc123xyz789"

# Store a JSON object with multiple keys
aws secretsmanager create-secret \
  --name "myapp/production/third-party-creds" \
  --secret-string '{
    "sendgrid_api_key": "SG.xxx",
    "twilio_auth_token": "xxx",
    "slack_webhook_url": "https://hooks.slack.com/services/xxx"
  }'
```

## Basic Secret Retrieval

Here's the simplest way to fetch a secret from Lambda:

```javascript
// Basic secret retrieval - no caching
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretId) {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  // Secrets can be stored as a string or binary
  if (response.SecretString) {
    return JSON.parse(response.SecretString);
  }

  // Binary secret
  return Buffer.from(response.SecretBinary);
}

exports.handler = async (event) => {
  const dbCreds = await getSecret('myapp/production/db-credentials');
  // Use dbCreds.username, dbCreds.password, etc.
};
```

This works, but it calls the Secrets Manager API on every invocation. That adds latency (about 50-100ms per call) and costs money ($0.05 per 10,000 API calls).

## Caching Secrets

Since Lambda execution environments persist between invocations, you can cache secrets outside the handler:

```javascript
// Cache secrets to avoid calling Secrets Manager on every invocation
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: 'us-east-1' });

// Cache object stored outside the handler - persists across warm invocations
const secretCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // Refresh cache every 5 minutes

async function getSecret(secretId) {
  const cached = secretCache[secretId];

  // Return cached value if it's still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  // Fetch from Secrets Manager
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  const value = response.SecretString
    ? JSON.parse(response.SecretString)
    : Buffer.from(response.SecretBinary);

  // Update cache
  secretCache[secretId] = { value, timestamp: Date.now() };

  return value;
}

exports.handler = async (event) => {
  const creds = await getSecret('myapp/production/db-credentials');
  const apiKey = await getSecret('myapp/production/stripe-api-key');

  // First invocation: 2 API calls (~100ms)
  // Subsequent invocations: 0 API calls (~0ms)
};
```

## Using the Lambda Extension for Caching

AWS provides a Secrets Manager Lambda extension that handles caching automatically. It runs as a local HTTP service within the Lambda execution environment:

```bash
# Add the Secrets Manager caching layer to your function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers "arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11"
```

Then retrieve secrets via a local HTTP call:

```javascript
// Use the Lambda extension for cached secret retrieval
const http = require('http');

// The extension runs on localhost port 2773
const EXTENSION_PORT = 2773;

async function getSecretFromExtension(secretId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: EXTENSION_PORT,
      path: `/secretsmanager/get?secretId=${encodeURIComponent(secretId)}`,
      headers: {
        'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN,
      },
    };

    http.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        resolve(JSON.parse(parsed.SecretString));
      });
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  // The extension caches automatically - no manual cache management
  const creds = await getSecretFromExtension('myapp/production/db-credentials');
  return { statusCode: 200, body: 'Connected!' };
};
```

## Python Secret Retrieval

Here's the Python equivalent with caching:

```python
# Python: retrieve and cache secrets from Secrets Manager
import json
import time
import boto3

client = boto3.client('secretsmanager', region_name='us-east-1')

# Simple cache implementation
_cache = {}
CACHE_TTL = 300  # 5 minutes

def get_secret(secret_id):
    cached = _cache.get(secret_id)
    if cached and time.time() - cached['timestamp'] < CACHE_TTL:
        return cached['value']

    response = client.get_secret_value(SecretId=secret_id)
    secret = json.loads(response['SecretString'])

    _cache[secret_id] = {'value': secret, 'timestamp': time.time()}
    return secret

def handler(event, context):
    db_creds = get_secret('myapp/production/db-credentials')

    # Connect to the database using the credentials
    import psycopg2
    conn = psycopg2.connect(
        host=db_creds['host'],
        port=db_creds['port'],
        dbname=db_creds['dbname'],
        user=db_creds['username'],
        password=db_creds['password']
    )

    return {'statusCode': 200}
```

## IAM Permissions

Your Lambda function's execution role needs permission to read the specific secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/production/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

The KMS permission is needed if your secrets are encrypted with a custom KMS key. Secrets encrypted with the default key don't need this.

## Secret Rotation

One of Secrets Manager's best features is automatic rotation. You can set up a rotation schedule that automatically changes your database password:

```bash
# Enable automatic rotation every 30 days
aws secretsmanager rotate-secret \
  --secret-id "myapp/production/db-credentials" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:123456789012:function:secret-rotation" \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}'
```

AWS provides rotation templates for common databases:

```yaml
# CloudFormation: RDS secret with automatic rotation
Resources:
  DbSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: myapp/production/db-credentials
      GenerateSecretString:
        SecretStringTemplate: '{"username": "app_user"}'
        GenerateStringKey: password
        PasswordLength: 32
        ExcludeCharacters: '"@/\'

  # Attach the secret to the RDS instance
  SecretTargetAttachment:
    Type: AWS::SecretsManager::SecretTargetAttachment
    Properties:
      SecretId: !Ref DbSecret
      TargetId: !Ref MyRDSInstance
      TargetType: AWS::RDS::DBInstance

  # Set up automatic rotation
  RotationSchedule:
    Type: AWS::SecretsManager::RotationSchedule
    DependsOn: SecretTargetAttachment
    Properties:
      SecretId: !Ref DbSecret
      HostedRotationLambda:
        RotationType: PostgreSQLSingleUser
        VpcSecurityGroupIds: !Ref RotationSecurityGroup
        VpcSubnetIds: !Join [",", [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
      RotationRules:
        ScheduleExpression: "rate(30 days)"
```

When rotation happens, your Lambda function's cache will still hold the old credentials. The TTL-based cache ensures the function picks up the new credentials within a few minutes. If you need immediate refresh, catch authentication failures and force a cache refresh:

```javascript
// Handle rotation gracefully - retry with fresh credentials
async function connectToDatabase() {
  const creds = await getSecret('myapp/production/db-credentials');

  try {
    return await createConnection(creds);
  } catch (error) {
    if (error.message.includes('authentication failed')) {
      // Credentials might have rotated - clear cache and retry
      console.log('Auth failed, refreshing credentials...');
      delete secretCache['myapp/production/db-credentials'];
      const freshCreds = await getSecret('myapp/production/db-credentials');
      return await createConnection(freshCreds);
    }
    throw error;
  }
}
```

## Secret Versioning

Secrets Manager maintains versions of your secrets. During rotation, both the old and new versions exist briefly:

```bash
# Get a specific version of a secret
aws secretsmanager get-secret-value \
  --secret-id "myapp/production/db-credentials" \
  --version-stage AWSCURRENT

# Get the previous version
aws secretsmanager get-secret-value \
  --secret-id "myapp/production/db-credentials" \
  --version-stage AWSPREVIOUS
```

## Environment Variable Alternative (Less Secure)

If you want a simpler approach for non-sensitive configuration, you can store the secret ARN in an environment variable and resolve it at startup:

```yaml
# Store the secret ARN, not the secret value
MyFunction:
  Type: AWS::Lambda::Function
  Properties:
    Environment:
      Variables:
        DB_SECRET_ARN: !Ref DbSecret
        # NOT the actual password - just the reference
```

```javascript
// Resolve the secret at function startup
const secretArn = process.env.DB_SECRET_ARN;
const creds = await getSecret(secretArn);
```

For configuration that doesn't need rotation or encryption, [Parameter Store](https://oneuptime.com/blog/post/2026-02-12-use-lambda-with-parameter-store-for-configuration/view) might be a simpler (and cheaper) alternative.

## Wrapping Up

Secrets Manager is the right place for database credentials, API keys, and any sensitive configuration your Lambda functions need. The key practices are: never put secrets in environment variables or code, always cache secret values to minimize API calls and latency, set up automatic rotation for database credentials, handle rotation gracefully with retry-on-auth-failure logic, and restrict IAM permissions to only the specific secrets each function needs. It adds a small amount of complexity compared to hardcoded credentials, but the security improvement is worth it.
