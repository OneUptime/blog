# How to Use AWS Systems Manager Parameter Store

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, Configuration Management

Description: A complete guide to AWS Systems Manager Parameter Store for managing application configuration, including parameter types, access patterns, and integration with other AWS services.

---

Every application needs configuration - database URLs, feature flags, API endpoints, service ports. Hardcoding these values is a recipe for pain. Environment variables work but are hard to manage across multiple services. Configuration files need to be deployed alongside your code.

AWS Systems Manager Parameter Store gives you a centralized, versioned, access-controlled store for configuration data. It's free for standard parameters, integrates with IAM for access control, and works seamlessly with other AWS services like Lambda, ECS, and CloudFormation.

## Parameter Types

Parameter Store supports three types:

- **String** - Plain text values like URLs, feature flags, or connection strings
- **StringList** - Comma-separated values
- **SecureString** - Encrypted values using AWS KMS (for secrets and passwords)

```bash
# Create a String parameter
aws ssm put-parameter \
  --name "/myapp/config/database-host" \
  --type String \
  --value "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"

# Create a StringList parameter
aws ssm put-parameter \
  --name "/myapp/config/allowed-origins" \
  --type StringList \
  --value "https://app.example.com,https://admin.example.com,https://api.example.com"

# Create a SecureString parameter (encrypted with default KMS key)
aws ssm put-parameter \
  --name "/myapp/secrets/database-password" \
  --type SecureString \
  --value "my-secret-password-123"
```

For more on SecureString parameters, see our dedicated guide on [storing secrets in Parameter Store](https://oneuptime.com/blog/post/parameter-store-securestring/view).

## Organizing Parameters with Hierarchies

Parameter Store supports hierarchical paths, which is the key to keeping things organized as you scale:

```bash
# Environment-specific configuration
/myapp/production/database-host
/myapp/production/database-port
/myapp/production/api-key

/myapp/staging/database-host
/myapp/staging/database-port
/myapp/staging/api-key

# Shared across environments
/myapp/shared/feature-flags
/myapp/shared/log-level
```

For a deep dive into hierarchies, check our guide on [Parameter Store hierarchies and paths](https://oneuptime.com/blog/post/parameter-store-hierarchies-paths/view).

## Reading Parameters

Get a single parameter:

```bash
# Get a parameter value
aws ssm get-parameter \
  --name "/myapp/config/database-host" \
  --query 'Parameter.Value' \
  --output text

# Get a SecureString parameter (decrypted)
aws ssm get-parameter \
  --name "/myapp/secrets/database-password" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text
```

Get multiple parameters at once:

```bash
# Get multiple parameters by name
aws ssm get-parameters \
  --names "/myapp/config/database-host" "/myapp/config/database-port" "/myapp/secrets/database-password" \
  --with-decryption \
  --query 'Parameters[*].{Name:Name,Value:Value}'
```

Get all parameters under a path:

```bash
# Get all parameters under a path prefix
aws ssm get-parameters-by-path \
  --path "/myapp/production" \
  --recursive \
  --with-decryption \
  --query 'Parameters[*].{Name:Name,Value:Value}'
```

## Using Parameter Store in Applications

### Python (boto3)

```python
# config.py - Load configuration from Parameter Store
import boto3

ssm = boto3.client('ssm', region_name='us-east-1')

def get_parameter(name, decrypt=False):
    """Get a single parameter from Parameter Store."""
    response = ssm.get_parameter(
        Name=name,
        WithDecryption=decrypt
    )
    return response['Parameter']['Value']

def get_config(path, decrypt=True):
    """Load all parameters under a path as a dictionary."""
    config = {}
    paginator = ssm.get_paginator('get_parameters_by_path')

    for page in paginator.paginate(
        Path=path,
        Recursive=True,
        WithDecryption=decrypt
    ):
        for param in page['Parameters']:
            # Extract the key name from the full path
            key = param['Name'].split('/')[-1]
            config[key] = param['Value']

    return config

# Usage
config = get_config('/myapp/production')
db_host = config['database-host']
db_password = config['database-password']
```

### Node.js

```javascript
// config.js - Load configuration from Parameter Store
const { SSMClient, GetParametersByPathCommand, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });

// Get a single parameter
async function getParameter(name, decrypt = false) {
  const response = await ssm.send(new GetParameterCommand({
    Name: name,
    WithDecryption: decrypt
  }));
  return response.Parameter.Value;
}

// Get all parameters under a path
async function getConfig(path) {
  const config = {};
  let nextToken;

  do {
    const response = await ssm.send(new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken
    }));

    for (const param of response.Parameters) {
      const key = param.Name.split('/').pop();
      config[key] = param.Value;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return config;
}

// Usage
async function main() {
  const config = await getConfig('/myapp/production');
  console.log('Database host:', config['database-host']);
}
```

### Java

```java
// ConfigLoader.java - Load configuration from Parameter Store
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.*;
import java.util.HashMap;
import java.util.Map;

public class ConfigLoader {
    private final SsmClient ssm;

    public ConfigLoader() {
        this.ssm = SsmClient.builder().build();
    }

    public Map<String, String> getConfig(String path) {
        Map<String, String> config = new HashMap<>();
        String nextToken = null;

        do {
            GetParametersByPathRequest request = GetParametersByPathRequest.builder()
                .path(path)
                .recursive(true)
                .withDecryption(true)
                .nextToken(nextToken)
                .build();

            GetParametersByPathResponse response = ssm.getParametersByPath(request);

            for (Parameter param : response.parameters()) {
                String key = param.name().substring(param.name().lastIndexOf('/') + 1);
                config.put(key, param.value());
            }

            nextToken = response.nextToken();
        } while (nextToken != null);

        return config;
    }
}
```

## Using Parameter Store with Lambda

Lambda can read parameters at startup. For better performance, read them outside the handler so they're cached across invocations:

```python
# lambda_function.py - Lambda with Parameter Store configuration
import boto3
import os

ssm = boto3.client('ssm')

# Load config at cold start (cached across invocations)
def load_config():
    env = os.environ.get('ENVIRONMENT', 'staging')
    response = ssm.get_parameters_by_path(
        Path=f'/myapp/{env}',
        Recursive=True,
        WithDecryption=True
    )
    config = {}
    for param in response['Parameters']:
        key = param['Name'].split('/')[-1]
        config[key] = param['Value']
    return config

CONFIG = load_config()

def handler(event, context):
    db_host = CONFIG['database-host']
    # Use the config...
    return {'statusCode': 200}
```

## Using Parameter Store with ECS

For ECS tasks, you can inject parameters directly into container environment variables:

```json
{
  "containerDefinitions": [
    {
      "name": "myapp",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/database-host"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/database-password"
        }
      ]
    }
  ]
}
```

The ECS task execution role needs `ssm:GetParameters` permission plus `kms:Decrypt` if using SecureString.

## Updating Parameters

```bash
# Update an existing parameter
aws ssm put-parameter \
  --name "/myapp/config/database-host" \
  --type String \
  --value "new-db.cluster-xyz789.us-east-1.rds.amazonaws.com" \
  --overwrite

# Parameters are versioned automatically
aws ssm get-parameter-history \
  --name "/myapp/config/database-host" \
  --query 'Parameters[*].{Version:Version,Value:Value,Date:LastModifiedDate}'
```

## Parameter Policies (Advanced Tier)

Advanced-tier parameters support policies for automatic expiration and notification:

```bash
# Create a parameter that expires in 30 days
aws ssm put-parameter \
  --name "/myapp/temp/api-key" \
  --type SecureString \
  --value "temp-key-123" \
  --tier Advanced \
  --policies '[
    {"Type":"Expiration","Version":"1.0","Attributes":{"Timestamp":"2026-03-15T00:00:00.000Z"}},
    {"Type":"ExpirationNotification","Version":"1.0","Attributes":{"Before":"15","Unit":"Days"}}
  ]'
```

## Standard vs. Advanced Tier

| Feature | Standard | Advanced |
|---|---|---|
| Max parameters | 10,000 | 100,000 |
| Max value size | 4 KB | 8 KB |
| Parameter policies | No | Yes |
| Cost | Free | $0.05/parameter/month |

For most applications, standard tier is more than enough.

## Monitoring

Track parameter access and changes using CloudTrail. And for monitoring the applications that depend on these configurations, [OneUptime](https://oneuptime.com) can help you correlate configuration changes with application behavior.

For using parameters in your infrastructure code, see our guide on [referencing Parameter Store values in CloudFormation](https://oneuptime.com/blog/post/parameter-store-cloudformation/view).
