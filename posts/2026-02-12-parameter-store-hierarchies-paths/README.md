# How to Use Parameter Store Hierarchies and Paths

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, Configuration Management

Description: Learn how to organize AWS Systems Manager Parameter Store parameters using hierarchical paths for multi-environment, multi-application configuration management.

---

When you've got five parameters, organization doesn't matter. When you've got five hundred, it's everything. AWS Systems Manager Parameter Store supports hierarchical paths that let you organize parameters like a filesystem. This is the difference between a configuration system that scales and one that becomes an unmanageable mess.

Paths in Parameter Store work exactly like directory paths. A parameter named `/myapp/production/database/host` has four levels. You can query all parameters under `/myapp/production` or just those under `/myapp/production/database`. Combined with IAM policies scoped to paths, you get a powerful system for managing configuration across multiple applications and environments.

## Naming Convention

Before creating a single parameter, settle on a naming convention. Here's one that works well for most organizations:

```
/<organization>/<application>/<environment>/<category>/<parameter-name>
```

For example:

```
/acme/orders-api/production/database/host
/acme/orders-api/production/database/port
/acme/orders-api/production/database/password
/acme/orders-api/production/cache/redis-url
/acme/orders-api/staging/database/host
/acme/orders-api/staging/database/port
/acme/payments-api/production/stripe/api-key
/acme/payments-api/production/stripe/webhook-secret
```

Simpler projects might use fewer levels:

```
/<application>/<environment>/<parameter-name>
```

```
/orders-api/production/database-host
/orders-api/production/database-password
/orders-api/staging/database-host
```

Pick a convention and stick with it. Consistency matters more than the specific format.

## Creating Hierarchical Parameters

```bash
# Create parameters organized by application, environment, and category
aws ssm put-parameter \
  --name "/myapp/production/database/host" \
  --type String \
  --value "prod-db.cluster-abc123.us-east-1.rds.amazonaws.com"

aws ssm put-parameter \
  --name "/myapp/production/database/port" \
  --type String \
  --value "5432"

aws ssm put-parameter \
  --name "/myapp/production/database/name" \
  --type String \
  --value "orders_production"

aws ssm put-parameter \
  --name "/myapp/production/database/password" \
  --type SecureString \
  --value "prod-secret-password"

aws ssm put-parameter \
  --name "/myapp/production/cache/redis-url" \
  --type SecureString \
  --value "redis://prod-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379"

aws ssm put-parameter \
  --name "/myapp/production/features/new-checkout" \
  --type String \
  --value "true"

# Same structure for staging
aws ssm put-parameter \
  --name "/myapp/staging/database/host" \
  --type String \
  --value "staging-db.cluster-xyz789.us-east-1.rds.amazonaws.com"

aws ssm put-parameter \
  --name "/myapp/staging/database/port" \
  --type String \
  --value "5432"

aws ssm put-parameter \
  --name "/myapp/staging/database/password" \
  --type SecureString \
  --value "staging-password"
```

## Querying by Path

The real power of hierarchies is the `get-parameters-by-path` API:

```bash
# Get all production config for myapp
aws ssm get-parameters-by-path \
  --path "/myapp/production" \
  --recursive \
  --with-decryption \
  --query 'Parameters[*].{Name:Name,Value:Value}'

# Get just database config
aws ssm get-parameters-by-path \
  --path "/myapp/production/database" \
  --recursive \
  --with-decryption

# Get all config for all apps (be careful with this one)
aws ssm get-parameters-by-path \
  --path "/myapp" \
  --recursive \
  --with-decryption
```

The `--recursive` flag is important. Without it, you only get parameters at the exact path level, not nested ones.

```bash
# Without --recursive: only gets parameters directly under /myapp/production
# (none in this case, since all parameters are one level deeper)
aws ssm get-parameters-by-path \
  --path "/myapp/production"

# With --recursive: gets ALL parameters under /myapp/production/
aws ssm get-parameters-by-path \
  --path "/myapp/production" \
  --recursive
```

## Loading Configuration in Applications

Here's a pattern for loading environment-specific configuration:

```python
# config_loader.py - Environment-aware configuration loader
import boto3
import os

class Config:
    def __init__(self, app_name, environment):
        self.ssm = boto3.client('ssm')
        self.app_name = app_name
        self.environment = environment
        self._cache = {}
        self._load()

    def _load(self):
        """Load all parameters for the application and environment."""
        path = f"/{self.app_name}/{self.environment}"
        paginator = self.ssm.get_paginator('get_parameters_by_path')

        for page in paginator.paginate(
            Path=path,
            Recursive=True,
            WithDecryption=True
        ):
            for param in page['Parameters']:
                # Strip the prefix to get a clean key
                # /myapp/production/database/host becomes database/host
                key = param['Name'][len(path) + 1:]
                self._cache[key] = param['Value']

    def get(self, key, default=None):
        """Get a configuration value by its relative path."""
        return self._cache.get(key, default)

    def get_section(self, prefix):
        """Get all parameters under a sub-path as a dictionary."""
        section = {}
        for key, value in self._cache.items():
            if key.startswith(prefix + '/'):
                short_key = key[len(prefix) + 1:]
                section[short_key] = value
        return section

# Usage
env = os.environ.get('ENVIRONMENT', 'staging')
config = Config('myapp', env)

# Get individual values
db_host = config.get('database/host')
db_password = config.get('database/password')

# Get all database config
db_config = config.get_section('database')
# {'host': '...', 'port': '5432', 'name': '...', 'password': '...'}

# Get feature flags
new_checkout = config.get('features/new-checkout', 'false') == 'true'
```

## IAM Policies Scoped to Paths

One of the best features of hierarchical parameters is path-based IAM access control. You can give each application access only to its own parameters:

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
      "Resource": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/*"
    }
  ]
}
```

For a multi-app setup, give each app access only to its path:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OrdersApiAccess",
      "Effect": "Allow",
      "Action": ["ssm:GetParameter*"],
      "Resource": "arn:aws:ssm:us-east-1:123456789:parameter/orders-api/production/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalTag/Application": "orders-api"
        }
      }
    }
  ]
}
```

Separate read and write access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadAllEnvironments",
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
      "Resource": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/*"
    },
    {
      "Sid": "WriteOnlyNonProduction",
      "Effect": "Allow",
      "Action": ["ssm:PutParameter", "ssm:DeleteParameter"],
      "Resource": [
        "arn:aws:ssm:us-east-1:123456789:parameter/myapp/staging/*",
        "arn:aws:ssm:us-east-1:123456789:parameter/myapp/development/*"
      ]
    },
    {
      "Sid": "DenyWriteProduction",
      "Effect": "Deny",
      "Action": ["ssm:PutParameter", "ssm:DeleteParameter"],
      "Resource": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/production/*"
    }
  ]
}
```

## Shared Parameters

Sometimes multiple applications need the same configuration (like a shared database endpoint). Use a shared path:

```bash
# Shared infrastructure parameters
/shared/production/database/main-cluster-endpoint
/shared/production/cache/redis-cluster-endpoint
/shared/production/messaging/sqs-queue-url

# Application-specific parameters
/orders-api/production/specific-config
/payments-api/production/specific-config
```

Applications load both their own config and the shared config:

```python
# Load shared and app-specific config
shared_config = Config('shared', environment)
app_config = Config('orders-api', environment)

# Merge with app config taking precedence
db_host = app_config.get('database/host') or shared_config.get('database/main-cluster-endpoint')
```

## Listing and Managing Parameters

```bash
# List all parameters under a path (metadata only, no values)
aws ssm describe-parameters \
  --parameter-filters "Key=Path,Values=/myapp/production,Option=Recursive" \
  --query 'Parameters[*].{Name:Name,Type:Type,Version:Version,Modified:LastModifiedDate}'

# Count parameters by path
aws ssm describe-parameters \
  --parameter-filters "Key=Path,Values=/myapp/production,Option=Recursive" \
  --query 'length(Parameters)'

# Delete all parameters under a path (be careful!)
PARAMS=$(aws ssm describe-parameters \
  --parameter-filters "Key=Path,Values=/myapp/development,Option=Recursive" \
  --query 'Parameters[*].Name' --output text)

for param in $PARAMS; do
  aws ssm delete-parameter --name "$param"
  echo "Deleted: $param"
done
```

## Migration Script

If you have existing flat parameters and want to migrate to a hierarchy:

```python
# migrate_params.py - Migrate flat parameters to hierarchical structure
import boto3

ssm = boto3.client('ssm')

# Define the mapping from old names to new paths
MIGRATIONS = {
    'myapp-prod-db-host': '/myapp/production/database/host',
    'myapp-prod-db-password': '/myapp/production/database/password',
    'myapp-prod-redis-url': '/myapp/production/cache/redis-url',
    'myapp-staging-db-host': '/myapp/staging/database/host',
}

for old_name, new_path in MIGRATIONS.items():
    try:
        # Read the old parameter
        response = ssm.get_parameter(Name=old_name, WithDecryption=True)
        param = response['Parameter']

        # Create the new parameter
        ssm.put_parameter(
            Name=new_path,
            Type=param['Type'],
            Value=param['Value'],
            Description=f'Migrated from {old_name}'
        )
        print(f'Migrated: {old_name} -> {new_path}')

    except ssm.exceptions.ParameterNotFound:
        print(f'Skipped (not found): {old_name}')
```

## Best Practices

1. **Plan your hierarchy before creating parameters** - Changing paths later means updating all consumers.
2. **Keep paths reasonably short** - Deep nesting adds complexity without much benefit. 3-4 levels is usually right.
3. **Use lowercase with hyphens** - Consistent formatting prevents confusion.
4. **Scope IAM policies to paths** - This is the main security benefit of hierarchies.
5. **Document your convention** - New team members need to know where to find and create parameters.

For monitoring configuration-dependent applications and detecting when config changes cause issues, check out [OneUptime](https://oneuptime.com). And for using your organized parameters in infrastructure code, see our guide on [referencing Parameter Store values in CloudFormation](https://oneuptime.com/blog/post/2026-02-12-parameter-store-cloudformation/view).
