# How to Use Secrets Manager vs Parameter Store

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Secrets Manager, SSM, Security, Parameter Store

Description: A detailed comparison of AWS Secrets Manager and SSM Parameter Store to help you choose the right service for storing secrets, configuration, and sensitive data.

---

"Should I use Secrets Manager or Parameter Store?" is one of the most common questions I hear from teams setting up their AWS infrastructure. Both services store sensitive values securely. Both integrate with IAM. Both work with ECS, Lambda, and other AWS services. But they're designed for different use cases, and picking the wrong one can cost you money or leave you without features you need.

Let's break down the real differences, when to use each, and how to use them together.

## The Quick Answer

Use **Secrets Manager** when you need automatic rotation, cross-region replication, or you're storing database credentials that should be rotated regularly.

Use **Parameter Store** when you need a free, simple key-value store for configuration data, feature flags, or secrets that don't need rotation.

Use **both** when you have a mix of needs - which is most teams.

## Feature Comparison

Here's a concrete comparison of what each service offers.

**Secrets Manager:**
- $0.40 per secret per month
- $0.05 per 10,000 API calls
- Built-in automatic rotation with Lambda
- Cross-region secret replication
- Random password generation
- Stores up to 64KB per secret
- Always encrypted with KMS
- Native RDS, Redshift, DocumentDB rotation support

**Parameter Store (Standard tier):**
- Free (up to 10,000 parameters)
- No per-request charges for standard throughput
- No built-in rotation
- No cross-region replication
- Stores up to 4KB per parameter (8KB for Advanced)
- Supports both plaintext and encrypted (SecureString)
- Higher throughput available with Advanced tier ($0.05/parameter/month)

**Parameter Store (Advanced tier):**
- $0.05 per parameter per month
- Up to 100,000 parameters
- 8KB parameter size
- Parameter policies (expiration, notification)
- Higher throughput (up to 10,000 requests/second)

## Cost Analysis

Cost is often the deciding factor. Let's do the math for a typical application.

Imagine you have 50 secrets (database creds, API keys, etc.) and 200 configuration parameters. Your application makes about 1 million secret reads per month.

With everything in Secrets Manager:
- 250 secrets x $0.40 = $100/month
- 1M API calls x $0.05/10K = $5/month
- Total: $105/month

With a split approach (secrets in SM, config in PS):
- 50 secrets x $0.40 = $20/month
- 50 secrets x 200K calls x $0.05/10K = $1/month
- 200 config parameters in Parameter Store Standard = $0/month
- Total: $21/month

That's an 80% cost reduction by using the right tool for each job.

## When Secrets Manager Wins

**Database credential rotation.** This is Secrets Manager's killer feature. It ships with Lambda-based rotation for RDS, Aurora, Redshift, and DocumentDB. You enable it and forget about it.

```bash
# Create a secret with automatic rotation
aws secretsmanager create-secret \
  --name "production/database/app" \
  --secret-string '{"username":"app_user","password":"initial-pass","engine":"postgres","host":"db.example.com","port":5432}'

# Enable 30-day rotation
aws secretsmanager rotate-secret \
  --secret-id "production/database/app" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:123456789012:function:rotation-function" \
  --rotation-rules '{"AutomaticallyAfterDays": 30}'
```

**Cross-region replication.** If you need the same secret available in multiple regions (for DR or multi-region apps), Secrets Manager handles this natively.

```bash
# Replicate a secret to another region
aws secretsmanager replicate-secret-to-regions \
  --secret-id "production/database/app" \
  --add-replica-regions '[{"Region": "eu-west-1"}]'
```

**Random password generation.** Secrets Manager can generate cryptographically secure passwords with configurable requirements.

```bash
# Generate a random password
aws secretsmanager get-random-password \
  --password-length 32 \
  --require-each-included-type \
  --exclude-characters '/@"'
```

## When Parameter Store Wins

**Application configuration.** Non-sensitive config like feature flags, endpoint URLs, and tuning parameters belong in Parameter Store. It's free and has a clean hierarchical structure.

```bash
# Store configuration parameters with a hierarchical path
aws ssm put-parameter \
  --name "/production/app/feature-flags/new-dashboard" \
  --value "true" \
  --type "String"

aws ssm put-parameter \
  --name "/production/app/config/max-connections" \
  --value "100" \
  --type "String"

aws ssm put-parameter \
  --name "/production/app/config/cache-ttl" \
  --value "300" \
  --type "String"

# Get all parameters under a path
aws ssm get-parameters-by-path \
  --path "/production/app/config" \
  --recursive
```

The path-based organization is great. You can fetch all parameters for a service in one call.

**Simple secrets that don't need rotation.** Things like third-party API keys that you manage manually work fine as SecureString parameters.

```bash
# Store a secret as a SecureString parameter
aws ssm put-parameter \
  --name "/production/app/secrets/stripe-api-key" \
  --value "sk_live_abc123" \
  --type "SecureString" \
  --key-id "alias/parameter-store-key"

# Retrieve it
aws ssm get-parameter \
  --name "/production/app/secrets/stripe-api-key" \
  --with-decryption
```

**High-throughput reads.** If your application reads configuration values thousands of times per second, Parameter Store's standard throughput (40 TPS default, scalable) with no per-request cost is more economical than Secrets Manager.

## Using Both Together

Most mature AWS setups use both services. Here's a typical pattern.

```python
import boto3
import json
import os

sm_client = boto3.client('secretsmanager')
ssm_client = boto3.client('ssm')


def get_secret(name):
    """Get a rotating secret from Secrets Manager."""
    response = sm_client.get_secret_value(SecretId=name)
    return json.loads(response['SecretString'])


def get_config(path):
    """Get configuration parameters from Parameter Store."""
    response = ssm_client.get_parameters_by_path(
        Path=path,
        Recursive=True,
        WithDecryption=True
    )

    config = {}
    for param in response['Parameters']:
        # Convert /production/app/config/cache-ttl to cache-ttl
        key = param['Name'].split('/')[-1]
        config[key] = param['Value']

    return config


# Application startup
db_creds = get_secret('production/database/app')         # From Secrets Manager
app_config = get_config('/production/app/config')          # From Parameter Store
feature_flags = get_config('/production/app/feature-flags') # From Parameter Store
```

## ECS Integration

Both services integrate natively with ECS task definitions.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "my-app:latest",
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/database/app:password::"
        },
        {
          "name": "CACHE_TTL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/production/app/config/cache-ttl"
        }
      ]
    }
  ]
}
```

ECS pulls from both services during task startup using the execution role.

## Lambda Integration

Lambda also supports both services through the Parameters and Secrets Extension.

```python
import urllib.request
import json
import os

TOKEN = os.environ['AWS_SESSION_TOKEN']

def get_from_extension(name, service='secretsmanager'):
    """Get value from either service through the Lambda extension."""
    if service == 'secretsmanager':
        url = f"http://localhost:2773/secretsmanager/get?secretId={name}"
    else:
        url = f"http://localhost:2773/systemsmanager/parameters/get?name={name}&withDecryption=true"

    request = urllib.request.Request(url)
    request.add_header('X-Aws-Parameters-Secrets-Token', TOKEN)

    response = urllib.request.urlopen(request)
    return json.loads(response.read())
```

## Migration Between Services

If you've outgrown Parameter Store for certain secrets and need rotation, here's how to migrate.

```python
import boto3
import json

ssm = boto3.client('ssm')
sm = boto3.client('secretsmanager')

def migrate_to_secrets_manager(param_name, secret_name):
    """Move a SecureString parameter to Secrets Manager."""
    # Get the current value
    response = ssm.get_parameter(
        Name=param_name,
        WithDecryption=True
    )
    value = response['Parameter']['Value']

    # Create in Secrets Manager
    sm.create_secret(
        Name=secret_name,
        SecretString=value,
        Description=f"Migrated from Parameter Store: {param_name}"
    )

    print(f"Migrated {param_name} to Secrets Manager as {secret_name}")
    print(f"Don't forget to update application references and delete the old parameter")
```

## Decision Framework

Here's a simple flowchart for deciding which service to use:

1. Does it need automatic rotation? -> **Secrets Manager**
2. Is it a database credential? -> **Secrets Manager**
3. Does it need cross-region replication? -> **Secrets Manager**
4. Is it non-sensitive configuration? -> **Parameter Store (String)**
5. Is it a simple secret you manage manually? -> **Parameter Store (SecureString)** or Secrets Manager (depends on volume)
6. Do you need to read it thousands of times per second? -> **Parameter Store**
7. Is cost a major concern? -> **Parameter Store** for everything possible

For more on using these services with specific compute platforms, check out our guides on [accessing secrets from Lambda](https://oneuptime.com/blog/post/2026-02-12-access-secrets-manager-secrets-lambda-functions/view) and [accessing secrets from ECS](https://oneuptime.com/blog/post/2026-02-12-access-secrets-manager-secrets-ecs-tasks/view).

## Wrapping Up

Don't pick just one. Secrets Manager and Parameter Store complement each other well. Use Secrets Manager for anything that needs rotation or cross-region access, and Parameter Store for everything else. This keeps your costs down while giving you the security features where they matter most. The key is having a clear convention your team follows so everyone knows where to look for what.
