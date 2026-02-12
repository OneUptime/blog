# How to Use AppConfig for Dynamic Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, AppConfig, Configuration Management, DevOps

Description: Learn how to use AWS AppConfig for dynamic application configuration that can be changed at runtime without redeploying, including deployment strategies, validators, and integration patterns.

---

Hardcoded configuration forces you to redeploy every time you need to change a timeout, toggle a log level, or update an API endpoint. Environment variables are better but still require a restart. What you really want is configuration that can change at runtime, with validation to prevent mistakes, gradual rollout to limit blast radius, and automatic rollback if something breaks.

That's what AWS AppConfig does for dynamic configuration. It's not just for feature flags - it handles any configuration your application needs to read at runtime. Rate limits, connection pool sizes, retry policies, external service URLs, caching TTLs - all managed centrally and deployed safely.

## Setting Up AppConfig for Configuration

Create the application and environment hierarchy.

```bash
# Create the application
APP_ID=$(aws appconfig create-application \
    --name "payment-service" \
    --description "Configuration for the payment service" \
    --query "Id" --output text)

# Create environments
PROD_ENV=$(aws appconfig create-environment \
    --application-id $APP_ID \
    --name "production" \
    --query "Id" --output text)

STAGING_ENV=$(aws appconfig create-environment \
    --application-id $APP_ID \
    --name "staging" \
    --query "Id" --output text)
```

## Creating a Freeform Configuration Profile

Unlike feature flags, dynamic configuration uses freeform JSON (or YAML).

```bash
# Create a freeform configuration profile
PROFILE_ID=$(aws appconfig create-configuration-profile \
    --application-id $APP_ID \
    --name "app-settings" \
    --location-uri "hosted" \
    --type "AWS.Freeform" \
    --query "Id" --output text)
```

## Defining Your Configuration

Structure your configuration in a way that makes sense for your application.

```json
{
    "database": {
        "connection_pool_size": 20,
        "connection_timeout_ms": 5000,
        "query_timeout_ms": 30000,
        "max_retries": 3,
        "retry_delay_ms": 1000
    },
    "cache": {
        "enabled": true,
        "ttl_seconds": 300,
        "max_entries": 10000,
        "eviction_policy": "lru"
    },
    "rate_limiting": {
        "enabled": true,
        "requests_per_minute": 1000,
        "burst_size": 50,
        "by_ip": true
    },
    "external_services": {
        "payment_gateway": {
            "url": "https://api.stripe.com/v1",
            "timeout_ms": 10000,
            "retry_count": 2
        },
        "notification_service": {
            "url": "https://notifications.internal.example.com",
            "timeout_ms": 5000,
            "retry_count": 1
        }
    },
    "logging": {
        "level": "INFO",
        "include_request_body": false,
        "include_response_body": false,
        "slow_query_threshold_ms": 1000
    }
}
```

Upload it to AppConfig.

```bash
# Create a hosted configuration version
aws appconfig create-hosted-configuration-version \
    --application-id $APP_ID \
    --configuration-profile-id $PROFILE_ID \
    --content-type "application/json" \
    --content file://app-config.json
```

## Adding Validators

Validators are essential for dynamic configuration. Without them, a typo in a JSON field could bring down your production service.

### JSON Schema Validator

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["database", "cache", "rate_limiting", "logging"],
    "properties": {
        "database": {
            "type": "object",
            "required": ["connection_pool_size", "connection_timeout_ms"],
            "properties": {
                "connection_pool_size": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100
                },
                "connection_timeout_ms": {
                    "type": "integer",
                    "minimum": 100,
                    "maximum": 30000
                },
                "query_timeout_ms": {
                    "type": "integer",
                    "minimum": 1000,
                    "maximum": 120000
                }
            }
        },
        "rate_limiting": {
            "type": "object",
            "properties": {
                "requests_per_minute": {
                    "type": "integer",
                    "minimum": 10,
                    "maximum": 100000
                }
            }
        },
        "logging": {
            "type": "object",
            "properties": {
                "level": {
                    "type": "string",
                    "enum": ["DEBUG", "INFO", "WARNING", "ERROR"]
                }
            }
        }
    }
}
```

### Lambda Validator for Business Logic

```python
# config_validator.py - Validate configuration against business rules
import json

def handler(event, context):
    """Validate configuration changes against business rules."""
    config = json.loads(event['content'])

    errors = []

    # Database pool size shouldn't be larger than the DB max connections
    db_pool = config.get('database', {}).get('connection_pool_size', 0)
    if db_pool > 50:
        errors.append(f"Database pool size {db_pool} exceeds recommended maximum of 50")

    # Rate limiting should never be disabled in production
    rate_limiting = config.get('rate_limiting', {})
    if not rate_limiting.get('enabled', True):
        errors.append("Rate limiting cannot be disabled in production")

    # Timeouts should be reasonable
    db_timeout = config.get('database', {}).get('query_timeout_ms', 0)
    if db_timeout > 60000:
        errors.append(f"Query timeout of {db_timeout}ms is dangerously high")

    if errors:
        raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")

    return {'valid': True}
```

Attach both validators to the configuration profile.

```bash
aws appconfig update-configuration-profile \
    --application-id $APP_ID \
    --configuration-profile-id $PROFILE_ID \
    --validators '[
        {"Type": "JSON_SCHEMA", "Content": "...schema JSON..."},
        {"Type": "LAMBDA", "Content": "arn:aws:lambda:us-east-1:123456789:function:config-validator"}
    ]'
```

## Deployment Strategies

Different configuration changes need different rollout speeds.

```bash
# For non-critical changes like log levels - deploy instantly
aws appconfig create-deployment-strategy \
    --name "Instant" \
    --deployment-duration-in-minutes 0 \
    --growth-factor 100 \
    --final-bake-time-in-minutes 0 \
    --replicate-to "NONE"

# For moderate-risk changes like timeout adjustments
aws appconfig create-deployment-strategy \
    --name "Linear10MinBake5Min" \
    --deployment-duration-in-minutes 10 \
    --growth-factor 20 \
    --growth-type "LINEAR" \
    --final-bake-time-in-minutes 5 \
    --replicate-to "NONE"

# For high-risk changes like rate limiting or database pool changes
aws appconfig create-deployment-strategy \
    --name "Canary10Pct30Min" \
    --deployment-duration-in-minutes 30 \
    --growth-factor 10 \
    --growth-type "LINEAR" \
    --final-bake-time-in-minutes 10 \
    --replicate-to "NONE"
```

## Deploying Configuration Changes

When you need to change a setting, create a new version and deploy it.

```bash
# Create a new configuration version with updated settings
aws appconfig create-hosted-configuration-version \
    --application-id $APP_ID \
    --configuration-profile-id $PROFILE_ID \
    --content-type "application/json" \
    --content file://updated-config.json

# Deploy to staging first
aws appconfig start-deployment \
    --application-id $APP_ID \
    --environment-id $STAGING_ENV \
    --deployment-strategy-id instant-strategy-id \
    --configuration-profile-id $PROFILE_ID \
    --configuration-version 2

# After validating in staging, deploy to production with gradual rollout
aws appconfig start-deployment \
    --application-id $APP_ID \
    --environment-id $PROD_ENV \
    --deployment-strategy-id linear-strategy-id \
    --configuration-profile-id $PROFILE_ID \
    --configuration-version 2
```

## Application Integration

### Using the AppConfig Agent

The AppConfig Agent handles caching and polling. It runs as a sidecar or Lambda extension and exposes configuration over localhost HTTP.

```python
# config_client.py - Dynamic configuration client
import requests
import json
import threading
import time

class DynamicConfig:
    """Client for reading dynamic configuration from AppConfig Agent."""

    def __init__(self, app_id, env_id, profile_id, poll_interval=30):
        self.url = f"http://localhost:2772/applications/{app_id}/environments/{env_id}/configurations/{profile_id}"
        self.poll_interval = poll_interval
        self._config = {}
        self._lock = threading.Lock()

        # Start background polling
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()

    def _poll_loop(self):
        """Background thread that polls for configuration updates."""
        while True:
            try:
                response = requests.get(self.url)
                if response.status_code == 200:
                    new_config = response.json()
                    with self._lock:
                        if new_config != self._config:
                            print("Configuration updated")
                            self._config = new_config
            except Exception as e:
                print(f"Config poll failed: {e}")
            time.sleep(self.poll_interval)

    def get(self, path, default=None):
        """Get a configuration value by dot-separated path.

        Example: config.get('database.connection_pool_size', 10)
        """
        with self._lock:
            keys = path.split('.')
            value = self._config
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return default
            return value

    @property
    def snapshot(self):
        """Get a snapshot of the current configuration."""
        with self._lock:
            return dict(self._config)

# Initialize once at startup
config = DynamicConfig(
    app_id="abc123",
    env_id="ghi789",
    profile_id="def456"
)

# Use throughout your application
pool_size = config.get('database.connection_pool_size', 10)
cache_ttl = config.get('cache.ttl_seconds', 300)
log_level = config.get('logging.level', 'INFO')
rate_limit = config.get('rate_limiting.requests_per_minute', 1000)
```

### Reacting to Configuration Changes

Some configuration changes need active handling - like resizing a connection pool or changing the log level.

```python
# config_watcher.py - React to configuration changes
import logging

class ConfigWatcher:
    """Watch for configuration changes and apply them."""

    def __init__(self, config_client):
        self.config = config_client
        self._previous = {}
        self._handlers = {}

    def register_handler(self, path, handler):
        """Register a handler for when a specific config path changes."""
        self._handlers[path] = handler

    def check_for_changes(self):
        """Check if any watched config values have changed."""
        current = self.config.snapshot

        for path, handler in self._handlers.items():
            current_value = self.config.get(path)
            previous_value = self._previous.get(path)

            if current_value != previous_value:
                print(f"Config changed: {path} = {previous_value} -> {current_value}")
                handler(current_value)
                self._previous[path] = current_value

# Example handlers
def update_log_level(new_level):
    """Change the application log level dynamically."""
    level = getattr(logging, new_level, logging.INFO)
    logging.getLogger().setLevel(level)
    print(f"Log level changed to {new_level}")

def resize_connection_pool(new_size):
    """Resize the database connection pool."""
    db_pool.resize(new_size)
    print(f"Connection pool resized to {new_size}")

# Set up watchers
watcher = ConfigWatcher(config)
watcher.register_handler('logging.level', update_log_level)
watcher.register_handler('database.connection_pool_size', resize_connection_pool)
```

## Storing Configuration in S3 or SSM

Besides hosted configuration, AppConfig can read from S3 buckets or SSM Parameter Store.

```bash
# Use an S3 bucket as the configuration source
aws appconfig create-configuration-profile \
    --application-id $APP_ID \
    --name "s3-config" \
    --location-uri "s3://my-config-bucket/payment-service/config.json" \
    --retrieval-role-arn "arn:aws:iam::123456789:role/AppConfigS3Role" \
    --type "AWS.Freeform"

# Use SSM Parameter Store
aws appconfig create-configuration-profile \
    --application-id $APP_ID \
    --name "ssm-config" \
    --location-uri "ssm-parameter:///myapp/config" \
    --type "AWS.Freeform"
```

S3 is good for large configuration files. SSM Parameter Store is good for configurations you want to manage alongside other SSM parameters.

## Monitoring Deployments

Track deployment progress and set up alarms.

```bash
# List deployments
aws appconfig list-deployments \
    --application-id $APP_ID \
    --environment-id $PROD_ENV

# Get deployment details
aws appconfig get-deployment \
    --application-id $APP_ID \
    --environment-id $PROD_ENV \
    --deployment-number 5
```

Set up CloudWatch alarms that automatically roll back bad deployments.

```bash
# Create a CloudWatch alarm for error rate
aws cloudwatch put-metric-alarm \
    --alarm-name "ConfigDeploymentErrorRate" \
    --metric-name "5XXError" \
    --namespace "AWS/ApplicationELB" \
    --statistic Average \
    --period 60 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "arn:aws:sns:us-east-1:123456789:ops-alerts"
```

Connect this alarm to AppConfig's environment to enable automatic rollback.

```bash
aws appconfig update-environment \
    --application-id $APP_ID \
    --environment-id $PROD_ENV \
    --monitors '[{
        "AlarmArn": "arn:aws:cloudwatch:us-east-1:123456789:alarm:ConfigDeploymentErrorRate",
        "AlarmRoleArn": "arn:aws:iam::123456789:role/AppConfigCloudWatchRole"
    }]'
```

Now if your error rate spikes during a configuration deployment, AppConfig automatically rolls back to the previous version.

## Wrapping Up

Dynamic configuration with AppConfig eliminates the "redeploy to change a setting" problem. The combination of validators, gradual deployment strategies, and CloudWatch-based rollback means you can change production configuration with confidence.

Start by identifying the settings you change most frequently. Those are your candidates for moving to AppConfig. Database timeouts, log levels, and rate limits are good first choices. Once you're comfortable with the workflow, expand to cover more of your application's configuration.

For feature-flag-specific usage, see our guide on [setting up AppConfig for feature flags](https://oneuptime.com/blog/post/set-up-aws-appconfig-for-feature-flags/view).
