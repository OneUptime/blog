# How to Use Lambda Powertools Parameters for SSM and Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SSM, Secrets Manager, Powertools

Description: Learn how to use Lambda Powertools Parameters utility to fetch, cache, and manage configuration from SSM Parameter Store and Secrets Manager in Lambda functions.

---

Every Lambda function needs configuration - database endpoints, API keys, feature flags, connection strings. Hardcoding these in environment variables is quick but inflexible. Fetching them from SSM Parameter Store or Secrets Manager on every invocation is correct but slow and expensive. Lambda Powertools Parameters solves this by giving you a clean API for fetching configuration with built-in caching.

The Parameters utility supports SSM Parameter Store, Secrets Manager, DynamoDB, and AppConfig. It handles caching, automatic refresh, and even transforms (like decrypting or JSON parsing) transparently.

## Why Not Just Use Environment Variables?

Environment variables work fine for static, non-sensitive configuration. But they have real limitations. You can't update them without redeploying the function. They're visible in plain text in the console and CloudFormation templates. There's a 4KB total size limit. And if you have a secret that needs to rotate, you have to redeploy every function that uses it.

SSM Parameter Store and Secrets Manager solve all of these problems, and Powertools Parameters makes them easy to use.

## Basic Usage with SSM Parameter Store

Fetching parameters from SSM is a single function call.

```python
from aws_lambda_powertools.utilities.parameters import get_parameter
from aws_lambda_powertools import Logger

logger = Logger(service="order-service")

def handler(event, context):
    # Fetch a single parameter (cached for 5 seconds by default)
    api_endpoint = get_parameter("/myapp/production/api-endpoint")
    feature_flag = get_parameter("/myapp/production/enable-new-checkout")

    logger.info("Config loaded", extra={
        "api_endpoint": api_endpoint,
        "new_checkout_enabled": feature_flag
    })

    if feature_flag == "true":
        return process_with_new_checkout(event, api_endpoint)
    else:
        return process_with_legacy_checkout(event, api_endpoint)
```

The parameter value is cached in memory. For the next 5 seconds, subsequent calls to `get_parameter` with the same name return the cached value without making an API call. This is important because SSM has API rate limits, and fetching on every invocation would both slow down your function and risk throttling.

## Fetching Multiple Parameters

When you have a group of related parameters, fetch them all at once.

```python
from aws_lambda_powertools.utilities.parameters import get_parameters
from aws_lambda_powertools import Logger

logger = Logger()

def handler(event, context):
    # Fetch all parameters under a path
    # /myapp/production/db/host, /myapp/production/db/port, /myapp/production/db/name
    db_config = get_parameters("/myapp/production/db/")

    # Returns a dict: {"host": "...", "port": "5432", "name": "orders"}
    logger.info("Database config loaded", extra={"keys": list(db_config.keys())})

    connection = connect_to_database(
        host=db_config["host"],
        port=int(db_config["port"]),
        database=db_config["name"]
    )

    # Process the event using the connection
    return {"statusCode": 200}
```

## Fetching Secrets from Secrets Manager

Secrets Manager is the right place for database passwords, API keys, and other sensitive credentials.

```python
from aws_lambda_powertools.utilities.parameters import get_secret
from aws_lambda_powertools import Logger
import json

logger = Logger()

def handler(event, context):
    # Fetch a secret (cached for 5 seconds by default)
    db_secret = get_secret("production/database/credentials")

    # If the secret is a JSON string, parse it
    credentials = json.loads(db_secret)

    connection = connect_to_database(
        host=credentials["host"],
        port=credentials["port"],
        username=credentials["username"],
        password=credentials["password"]
    )

    logger.info("Connected to database", extra={"host": credentials["host"]})
    # Never log the password!

    return process_query(connection, event)
```

## Transform Parameters

Powertools can automatically transform parameter values - parsing JSON, decoding base64, or decrypting SecureStrings.

```python
from aws_lambda_powertools.utilities.parameters import (
    get_parameter,
    get_parameters,
    get_secret
)

def handler(event, context):
    # Auto-parse JSON parameter
    # Parameter value: '{"timeout": 30, "retries": 3, "batch_size": 100}'
    app_config = get_parameter(
        "/myapp/production/config",
        transform="json"
    )
    # app_config is now a dict: {"timeout": 30, "retries": 3, "batch_size": 100}

    # Auto-decode base64 parameter
    certificate = get_parameter(
        "/myapp/production/tls-cert",
        transform="binary"
    )
    # certificate is now decoded bytes

    # Auto-parse JSON secret
    db_credentials = get_secret(
        "production/database/credentials",
        transform="json"
    )
    # db_credentials is now a dict with host, username, password, etc.

    # Transform all parameters under a path
    all_configs = get_parameters(
        "/myapp/production/configs/",
        transform="json"
    )
    # Each value is automatically parsed from JSON

    return process_event(event, app_config, db_credentials)
```

## Custom Cache Duration

The default cache duration is 5 seconds. For parameters that change infrequently, increase it to reduce API calls and improve performance.

```python
from aws_lambda_powertools.utilities.parameters import get_parameter, get_secret

def handler(event, context):
    # Cache for 5 minutes - good for feature flags
    feature_flags = get_parameter(
        "/myapp/production/feature-flags",
        transform="json",
        max_age=300  # 300 seconds = 5 minutes
    )

    # Cache for 15 minutes - good for database credentials
    db_creds = get_secret(
        "production/database/credentials",
        transform="json",
        max_age=900  # 15 minutes
    )

    # Force refresh (bypass cache)
    fresh_config = get_parameter(
        "/myapp/production/config",
        transform="json",
        force_fetch=True  # Always fetch from SSM
    )

    return {"statusCode": 200}
```

Choose your cache duration based on how frequently the parameter changes and how quickly you need changes to take effect. For database credentials that rotate every 30 days, a 15-minute cache is fine. For a kill switch feature flag, you might want a shorter cache.

## Using the SSM Provider Directly

For more control, use the SSMProvider class directly.

```python
from aws_lambda_powertools.utilities.parameters import SSMProvider
from aws_lambda_powertools import Logger

logger = Logger()

# Create a provider with custom configuration
ssm_provider = SSMProvider()

def handler(event, context):
    # Get a single parameter
    endpoint = ssm_provider.get("/myapp/production/api-endpoint")

    # Get multiple parameters by path
    db_params = ssm_provider.get_multiple("/myapp/production/database/")

    # Get with decryption (for SecureString parameters)
    api_key = ssm_provider.get(
        "/myapp/production/api-key",
        decrypt=True
    )

    logger.info("Parameters loaded", extra={
        "endpoint": endpoint,
        "db_params_count": len(db_params)
    })

    return {"statusCode": 200}
```

## Using the Secrets Manager Provider

Similarly, you can use the SecretsProvider for more control over Secrets Manager access.

```python
from aws_lambda_powertools.utilities.parameters import SecretsProvider

secrets_provider = SecretsProvider()

def handler(event, context):
    # Get a secret
    db_credentials = secrets_provider.get(
        "production/database/credentials",
        transform="json",
        max_age=600  # Cache for 10 minutes
    )

    # Get a specific version
    previous_creds = secrets_provider.get(
        "production/database/credentials",
        VersionStage="AWSPREVIOUS"
    )

    return {"statusCode": 200}
```

## DynamoDB Provider for Custom Parameters

If you need a custom parameter store (maybe for per-tenant configuration), use the DynamoDB provider.

```python
from aws_lambda_powertools.utilities.parameters import DynamoDBProvider

# DynamoDB table with partition key "id" and value stored in "value" attribute
ddb_provider = DynamoDBProvider(table_name="app-configuration")

def handler(event, context):
    tenant_id = event.get("tenant_id", "default")

    # Get tenant-specific configuration
    tenant_config = ddb_provider.get(
        tenant_id,
        transform="json",
        max_age=60
    )

    # Get all configuration under a path
    all_config = ddb_provider.get_multiple(
        "global",
        transform="json"
    )

    return {"statusCode": 200}
```

## AppConfig Provider for Feature Flags

AWS AppConfig is designed for feature flags and configuration that you want to roll out gradually.

```python
from aws_lambda_powertools.utilities.parameters import AppConfigProvider

appconfig = AppConfigProvider(
    environment="production",
    application="my-app"
)

def handler(event, context):
    # Get a feature flag configuration
    feature_flags = appconfig.get(
        "feature-flags",
        transform="json",
        max_age=120  # Check for updates every 2 minutes
    )

    if feature_flags.get("new_pricing_enabled"):
        return calculate_new_pricing(event)
    else:
        return calculate_legacy_pricing(event)
```

## Handling Parameter Errors

Parameters might not exist, might be temporarily unavailable, or you might lack permissions. Handle these cases.

```python
from aws_lambda_powertools.utilities.parameters import (
    get_parameter,
    get_secret
)
from aws_lambda_powertools.utilities.parameters.exceptions import (
    GetParameterError,
    TransformParameterError
)
from aws_lambda_powertools import Logger

logger = Logger()

# Default values for non-critical parameters
DEFAULT_CONFIG = {
    "timeout": 30,
    "retries": 3,
    "batch_size": 100
}

def handler(event, context):
    # For non-critical parameters, use defaults on failure
    try:
        config = get_parameter(
            "/myapp/production/config",
            transform="json"
        )
    except GetParameterError:
        logger.warning("Failed to fetch config, using defaults")
        config = DEFAULT_CONFIG
    except TransformParameterError:
        logger.error("Config parameter has invalid JSON format")
        config = DEFAULT_CONFIG

    # For critical secrets, fail fast
    try:
        db_creds = get_secret(
            "production/database/credentials",
            transform="json"
        )
    except GetParameterError as e:
        logger.error("Cannot fetch database credentials", extra={"error": str(e)})
        return {
            "statusCode": 500,
            "body": "Service temporarily unavailable"
        }

    return process_event(event, config, db_creds)
```

## IAM Permissions

Your Lambda function needs the right IAM permissions to fetch parameters and secrets.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMParameterAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/production/*"
    },
    {
      "Sid": "DecryptSecureStrings",
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abc-123",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.us-east-1.amazonaws.com"
        }
      }
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/*"
    }
  ]
}
```

## Performance Tips

Here are some practices to get the best performance from the Parameters utility.

```python
from aws_lambda_powertools.utilities.parameters import SSMProvider

# Tip 1: Initialize the provider outside the handler
# This reuses the boto3 client across invocations
ssm = SSMProvider()

# Tip 2: Use get_multiple instead of multiple get calls
# One API call instead of many
def handler(event, context):
    # GOOD: One API call
    all_params = ssm.get_multiple("/myapp/production/", max_age=300)

    # BAD: Multiple API calls
    # param1 = ssm.get("/myapp/production/param1")
    # param2 = ssm.get("/myapp/production/param2")
    # param3 = ssm.get("/myapp/production/param3")

    # Tip 3: Use appropriate cache durations
    # Longer cache = fewer API calls = better performance and lower cost
    config = ssm.get(
        "/myapp/production/config",
        transform="json",
        max_age=300  # 5 minutes is reasonable for most configs
    )

    return {"statusCode": 200}
```

## Summary

Lambda Powertools Parameters eliminates the boilerplate around fetching configuration from AWS parameter stores. It gives you built-in caching that prevents unnecessary API calls, automatic transformations for JSON and binary data, and a consistent API across SSM, Secrets Manager, DynamoDB, and AppConfig.

Stop hardcoding configuration in environment variables and stop making raw boto3 calls to SSM on every invocation. Powertools Parameters handles both the convenience and the performance optimization for you.

For the complete Lambda Powertools experience, see our overviews for [Python](https://oneuptime.com/blog/post/lambda-powertools-python/view), [TypeScript](https://oneuptime.com/blog/post/lambda-powertools-typescript/view), and [Java](https://oneuptime.com/blog/post/lambda-powertools-java/view).
