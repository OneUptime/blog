# How to Manage Application Configuration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration Management, Application Configuration, Microservice, Operation

Description: A practical guide to managing application configuration across multiple services using the Dapr Configuration API for consistent, centralized config management.

---

Managing configuration across tens or hundreds of microservices is a significant operational challenge. The Dapr Configuration API provides a consistent abstraction over multiple configuration backends, giving you centralized control over runtime settings while keeping your application code backend-agnostic.

## Configuration Management Principles

Before diving into Dapr specifics, establish these principles for your configuration management strategy:

1. **Centralize configuration** - avoid per-service config files that drift
2. **Version config changes** - track who changed what and when
3. **Separate environment configs** - dev, staging, prod should use different stores or key prefixes
4. **Never store secrets here** - use the Secrets API for credentials

## Organizing Configuration Keys

Use a consistent naming convention for configuration keys:

```bash
# Redis CLI - set configuration values (value||version format)
# Use separate Dapr components per environment, each pointing to its own Redis instance or DB
redis-cli SET myapp.max-connections "100||1"
redis-cli SET myapp.cache-ttl-seconds "300||1"
redis-cli SET myapp.log-level "warn||1"
redis-cli SET myapp.rate-limit-rps "1000||1"
```

## Defining the Configuration Component

Use a per-environment component or a shared component with key prefixes:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
  namespace: production
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Building a Configuration Service Wrapper

Wrap the Dapr config API in a utility class that your services import:

```typescript
import Axios from 'axios';

interface ConfigItem {
  value: string;
}

export class AppConfig {
  private static cache: Map<string, ConfigItem> = new Map();
  private static readonly STORE_NAME = 'appconfig';
  private static readonly DAPR_URL = 'http://localhost:3500';

  static async get(key: string, defaultValue?: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached) return cached.value;

    try {
      const resp = await Axios.get(
        `${this.DAPR_URL}/v1.0/configuration/${this.STORE_NAME}`,
        { params: { key } }
      );
      const item = resp.data[key];
      if (item) {
        this.cache.set(key, item);
        return item.value;
      }
    } catch (err) {
      console.warn(`Failed to load config key ${key}, using default`);
    }

    return defaultValue ?? '';
  }

  static async getInt(key: string, defaultValue: number): Promise<number> {
    const val = await this.get(key);
    return val ? parseInt(val, 10) : defaultValue;
  }

  static async getBool(key: string, defaultValue: boolean): Promise<boolean> {
    const val = await this.get(key);
    return val ? val === 'true' : defaultValue;
  }
}

// Usage
const maxConnections = await AppConfig.getInt('myapp.max-connections', 10);
const logLevel = await AppConfig.get('myapp.log-level', 'info');
const featureEnabled = await AppConfig.getBool('myapp.feature-new-ui', false);
```

## Updating Configuration Across Services

Update a configuration value and all subscribed services react automatically:

```bash
# Change log level across all services (update value, bump version)
redis-cli SET myapp.log-level "debug||2"

# This triggers subscription callbacks in all running services
# No restarts needed
```

## Validating Configuration at Startup

Add a startup validation step to ensure all required config keys exist:

```python
REQUIRED_CONFIG_KEYS = [
    "myapp.max-connections",
    "myapp.cache-ttl-seconds",
    "myapp.log-level",
]

async def validate_config():
    for key in REQUIRED_CONFIG_KEYS:
        resp = httpx.get(
            f"http://localhost:3500/v1.0/configuration/appconfig?key={key}"
        )
        config = resp.json()
        if key not in config or not config[key]["value"]:
            raise RuntimeError(f"Required configuration key missing: {key}")
    print("All required configuration keys present")
```

## Summary

Managing application configuration with Dapr involves defining a consistent key naming convention, choosing an appropriate backing store, wrapping the Dapr Configuration API in a reusable utility class, and subscribing to changes for real-time updates. This approach centralizes configuration management across all your microservices while remaining backend-agnostic.
