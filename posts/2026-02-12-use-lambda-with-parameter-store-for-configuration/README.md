# How to Use Lambda with Parameter Store for Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Parameter Store, SSM, Configuration

Description: Manage Lambda function configuration with AWS Systems Manager Parameter Store for feature flags, application settings, and environment-specific values.

---

Every application has configuration that changes between environments or over time - feature flags, API endpoints, batch sizes, cache TTLs, email templates. Hardcoding these in your Lambda function means redeploying every time you want to change a value. Environment variables work for some things but they're visible in the console and require a function update to change.

AWS Systems Manager Parameter Store gives you a centralized, versioned, and optionally encrypted configuration store that your Lambda functions can read at runtime. It's simpler and cheaper than Secrets Manager for non-secret configuration, and it integrates neatly into the Lambda execution model.

## Parameter Store vs Secrets Manager

Both store key-value pairs, but they serve different purposes:

| Feature | Parameter Store | Secrets Manager |
|---|---|---|
| Cost | Free (standard tier) | $0.40/secret/month |
| Automatic rotation | No | Yes |
| Cross-account sharing | Limited | Yes |
| Max size | 8 KB (standard) / 8 KB (advanced) | 64 KB |
| Throughput | 40 TPS standard, higher with advanced | 10,000 TPS |
| Best for | Config values, feature flags | Passwords, API keys, certificates |

Use Parameter Store for configuration. Use Secrets Manager for actual secrets. For secrets management, see our guide on [using Lambda with Secrets Manager](https://oneuptime.com/blog/post/2026-02-12-use-lambda-with-secrets-manager-for-secure-credentials/view).

## Creating Parameters

Store configuration values in Parameter Store:

```bash
# Simple string parameter
aws ssm put-parameter \
  --name "/myapp/production/api-endpoint" \
  --type String \
  --value "https://api.example.com/v2"

# String list (comma-separated values)
aws ssm put-parameter \
  --name "/myapp/production/allowed-origins" \
  --type StringList \
  --value "https://myapp.com,https://admin.myapp.com,https://staging.myapp.com"

# Secure string (encrypted with KMS)
aws ssm put-parameter \
  --name "/myapp/production/db-password" \
  --type SecureString \
  --value "my-database-password"

# Parameter with tags
aws ssm put-parameter \
  --name "/myapp/production/feature-flags" \
  --type String \
  --value '{"newDashboard": true, "darkMode": false, "betaFeatures": true}' \
  --tags "Key=Environment,Value=production" "Key=Service,Value=myapp"
```

Use a hierarchical naming convention like `/app/environment/parameter` to keep things organized and enable path-based retrieval.

## Basic Parameter Retrieval

Here's how to fetch parameters in a Lambda function:

```javascript
// Retrieve configuration from Parameter Store
const { SSMClient, GetParameterCommand, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });

async function getParameter(name) {
  const response = await ssm.send(new GetParameterCommand({
    Name: name,
    WithDecryption: true, // Automatically decrypts SecureString parameters
  }));
  return response.Parameter.Value;
}

exports.handler = async (event) => {
  const apiEndpoint = await getParameter('/myapp/production/api-endpoint');
  const allowedOrigins = await getParameter('/myapp/production/allowed-origins');

  console.log('API Endpoint:', apiEndpoint);
  console.log('Allowed Origins:', allowedOrigins.split(','));

  return { statusCode: 200 };
};
```

## Fetching Multiple Parameters by Path

Parameter Store supports fetching all parameters under a path, which is perfect for loading all config at once:

```javascript
// Load all configuration for an environment in one call
async function getConfigByPath(path) {
  const config = {};
  let nextToken;

  do {
    const response = await ssm.send(new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    }));

    for (const param of response.Parameters) {
      // Extract the parameter name relative to the path
      const key = param.Name.replace(path, '').replace(/^\//, '');
      config[key] = param.Value;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return config;
}

exports.handler = async (event) => {
  // Fetch all parameters under /myapp/production/
  const config = await getConfigByPath('/myapp/production');

  // config = {
  //   "api-endpoint": "https://api.example.com/v2",
  //   "allowed-origins": "https://myapp.com,...",
  //   "feature-flags": '{"newDashboard": true, ...}',
  //   "batch-size": "100",
  // }

  const featureFlags = JSON.parse(config['feature-flags']);
  const batchSize = parseInt(config['batch-size']);

  return { statusCode: 200 };
};
```

## Caching Parameters

Like Secrets Manager, you should cache parameter values to avoid API calls on every invocation:

```javascript
// Cache parameters with TTL-based expiration
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const ENVIRONMENT = process.env.ENVIRONMENT || 'production';
const CONFIG_PATH = `/myapp/${ENVIRONMENT}`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let configCache = null;
let cacheTimestamp = 0;

async function getConfig() {
  if (configCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return configCache;
  }

  console.log('Refreshing configuration from Parameter Store');
  const config = {};
  let nextToken;

  do {
    const response = await ssm.send(new GetParametersByPathCommand({
      Path: CONFIG_PATH,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    }));

    for (const param of response.Parameters) {
      const key = param.Name.split('/').pop();
      config[key] = param.Value;
    }
    nextToken = response.NextToken;
  } while (nextToken);

  configCache = config;
  cacheTimestamp = Date.now();
  return config;
}

exports.handler = async (event) => {
  const config = await getConfig();
  // Use config values throughout your function
};
```

## Using the Lambda Extension for Caching

The same AWS Parameters and Secrets Lambda Extension that works with Secrets Manager also caches Parameter Store values:

```bash
# Add the extension layer
aws lambda update-function-configuration \
  --function-name my-function \
  --layers "arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11"
```

```javascript
// Fetch parameters through the local extension cache
const http = require('http');

async function getParameterFromExtension(name) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(name)}&withDecryption=true`;
    http.get(url, {
      headers: { 'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data).Parameter.Value));
    }).on('error', reject);
  });
}
```

## Feature Flags Pattern

Parameter Store is great for feature flags that you want to change without redeploying:

```javascript
// Feature flag management with Parameter Store
async function getFeatureFlags() {
  const config = await getConfig();
  const flags = JSON.parse(config['feature-flags'] || '{}');
  return flags;
}

exports.handler = async (event) => {
  const flags = await getFeatureFlags();

  let response;
  if (flags.newCheckoutFlow) {
    response = await newCheckoutHandler(event);
  } else {
    response = await legacyCheckoutHandler(event);
  }

  if (flags.detailedLogging) {
    console.log('Response details:', JSON.stringify(response));
  }

  return response;
};
```

Toggle a feature instantly:

```bash
# Enable a feature flag without redeploying
aws ssm put-parameter \
  --name "/myapp/production/feature-flags" \
  --type String \
  --value '{"newCheckoutFlow": true, "detailedLogging": false, "maintenanceMode": false}' \
  --overwrite
```

The change takes effect within your cache TTL window (e.g., 5 minutes).

## Python Implementation

```python
# Python: Parameter Store configuration with caching
import json
import time
import boto3

ssm = boto3.client('ssm', region_name='us-east-1')

_config_cache = None
_cache_timestamp = 0
CACHE_TTL = 300  # 5 minutes

def get_config():
    global _config_cache, _cache_timestamp

    if _config_cache and time.time() - _cache_timestamp < CACHE_TTL:
        return _config_cache

    config = {}
    paginator = ssm.get_paginator('get_parameters_by_path')

    for page in paginator.paginate(
        Path='/myapp/production',
        Recursive=True,
        WithDecryption=True
    ):
        for param in page['Parameters']:
            key = param['Name'].split('/')[-1]
            config[key] = param['Value']

    _config_cache = config
    _cache_timestamp = time.time()
    return config

def handler(event, context):
    config = get_config()
    batch_size = int(config.get('batch-size', '50'))
    api_endpoint = config.get('api-endpoint')

    return {'statusCode': 200, 'body': json.dumps({'batchSize': batch_size})}
```

## IAM Permissions

Your Lambda function needs permission to read parameters:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/production/*"
    },
    {
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-key-id",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

The KMS permission is only needed if you use SecureString parameters with a custom KMS key.

## CloudFormation Integration

Reference Parameter Store values directly in CloudFormation:

```yaml
# Use Parameter Store values in CloudFormation templates
Parameters:
  ApiEndpoint:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /myapp/production/api-endpoint

Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Environment:
        Variables:
          # Resolve at deploy time
          API_ENDPOINT: !Ref ApiEndpoint
          # Or store the path for runtime resolution
          CONFIG_PATH: /myapp/production
```

## Parameter Store Tiers

Standard tier is free and sufficient for most use cases. Advanced tier ($0.05 per parameter per month) offers higher throughput (10,000 TPS), parameter policies (expiration, notification), and larger parameter sizes.

For Lambda functions with moderate parameter access, the standard tier with caching is more than enough.

## Wrapping Up

Parameter Store is the right tool for application configuration that isn't a secret - feature flags, API endpoints, batch sizes, and environment-specific settings. It's free, versioned, supports encryption for sensitive-but-not-secret values, and integrates with everything in AWS. Cache parameter values in your Lambda function to keep latency low and API calls minimal. Combined with Secrets Manager for actual credentials, you have a complete configuration management strategy for your serverless applications.
