# How to Implement Consul KV for Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Consul, KV Store, Configuration Management, HashiCorp, Distributed Systems, DevOps

Description: Learn how to use Consul's key-value store for centralized configuration management. This guide covers storing, retrieving, and watching configuration values with practical examples in multiple languages.

---

> Managing configuration across distributed services is challenging. Consul's built-in key-value store provides a central place to store configuration that all services can access, with support for watching changes in real-time.

The Consul KV store is a simple but powerful feature that eliminates the need for separate configuration management systems. It supports hierarchical keys, atomic operations, and distributed locks, making it suitable for everything from feature flags to database connection strings.

---

## Prerequisites

Before we begin, ensure you have:
- Consul cluster running (single node for development is fine)
- curl or a programming language SDK
- Basic understanding of Consul architecture

---

## KV Store Basics

### CLI Operations

The Consul CLI provides straightforward commands for KV operations:

```bash
# Store a value
consul kv put config/database/host "db.example.com"

# Store a value with flags (metadata)
consul kv put -flags=42 config/database/port "5432"

# Retrieve a value
consul kv get config/database/host

# Retrieve with metadata
consul kv get -detailed config/database/host

# List all keys under a prefix
consul kv get -recurse config/

# Delete a key
consul kv delete config/database/host

# Delete all keys under a prefix
consul kv delete -recurse config/database/
```

### Storing Structured Data

Store JSON or YAML configuration as values:

```bash
# Store JSON configuration
consul kv put config/app/settings '{
  "log_level": "info",
  "max_connections": 100,
  "timeout_seconds": 30,
  "feature_flags": {
    "new_checkout": true,
    "dark_mode": false
  }
}'

# Store from a file
consul kv put config/app/settings @config.json

# Retrieve and parse JSON
consul kv get config/app/settings | jq .feature_flags
```

---

## HTTP API Operations

### Basic CRUD Operations

```bash
# Create or update a key
curl -X PUT \
  http://localhost:8500/v1/kv/config/api/key \
  -d "secret-value-here"

# Read a key (returns base64 encoded value)
curl http://localhost:8500/v1/kv/config/api/key

# Read and decode the value
curl -s http://localhost:8500/v1/kv/config/api/key | \
  jq -r '.[0].Value' | base64 -d

# Delete a key
curl -X DELETE http://localhost:8500/v1/kv/config/api/key

# List keys with prefix
curl "http://localhost:8500/v1/kv/config/?keys"
```

### Atomic Operations

Use Compare-And-Swap (CAS) for atomic updates:

```bash
# Get current index
INDEX=$(curl -s http://localhost:8500/v1/kv/config/counter | \
  jq -r '.[0].ModifyIndex')

# Update only if index matches (atomic update)
curl -X PUT \
  "http://localhost:8500/v1/kv/config/counter?cas=$INDEX" \
  -d "new-value"

# Returns true if successful, false if value changed
```

---

## Configuration Hierarchy

Organize configuration in a logical hierarchy:

```
config/
├── global/
│   ├── log_level
│   └── environment
├── services/
│   ├── web-api/
│   │   ├── port
│   │   ├── database_url
│   │   └── cache_ttl
│   ├── payment-service/
│   │   ├── port
│   │   └── stripe_key
│   └── notification-service/
│       ├── port
│       └── smtp_settings
└── feature_flags/
    ├── new_dashboard
    └── beta_features
```

Set up this structure:

```bash
# Global configuration
consul kv put config/global/log_level "info"
consul kv put config/global/environment "production"

# Web API service configuration
consul kv put config/services/web-api/port "8080"
consul kv put config/services/web-api/database_url "postgres://db:5432/app"
consul kv put config/services/web-api/cache_ttl "300"

# Feature flags
consul kv put config/feature_flags/new_dashboard "true"
consul kv put config/feature_flags/beta_features "false"
```

---

## Programming Language Examples

### Python Integration

```python
import consul
import json

class ConfigManager:
    """
    Manages application configuration using Consul KV store.
    Provides caching and automatic type conversion.
    """

    def __init__(self, host='localhost', port=8500, prefix='config/'):
        self.client = consul.Consul(host=host, port=port)
        self.prefix = prefix
        self._cache = {}

    def get(self, key, default=None):
        """
        Retrieve a configuration value from Consul.
        Returns default if key doesn't exist.
        """
        full_key = f"{self.prefix}{key}"

        # Try to get from Consul
        index, data = self.client.kv.get(full_key)

        if data is None:
            return default

        # Decode the value
        value = data['Value'].decode('utf-8')

        # Try to parse as JSON for structured data
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    def set(self, key, value):
        """
        Store a configuration value in Consul.
        Automatically serializes complex types to JSON.
        """
        full_key = f"{self.prefix}{key}"

        # Serialize complex types
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        else:
            value = str(value)

        return self.client.kv.put(full_key, value)

    def get_all(self, prefix=''):
        """
        Retrieve all configuration under a prefix.
        Returns a dictionary of key-value pairs.
        """
        full_prefix = f"{self.prefix}{prefix}"
        index, data = self.client.kv.get(full_prefix, recurse=True)

        if data is None:
            return {}

        result = {}
        for item in data:
            # Remove the base prefix from the key
            key = item['Key'].replace(self.prefix, '')
            value = item['Value'].decode('utf-8') if item['Value'] else None

            # Try JSON parsing
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                pass

            result[key] = value

        return result

    def delete(self, key):
        """Delete a configuration key."""
        full_key = f"{self.prefix}{key}"
        return self.client.kv.delete(full_key)


# Usage example
config = ConfigManager(prefix='config/services/web-api/')

# Store configuration
config.set('port', 8080)
config.set('database', {
    'host': 'db.example.com',
    'port': 5432,
    'name': 'myapp'
})

# Retrieve configuration
port = config.get('port')  # Returns 8080
db_config = config.get('database')  # Returns dict

# Get all configuration for this service
all_config = config.get_all()
```

### Go Integration

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"

    "github.com/hashicorp/consul/api"
)

// ConfigManager handles Consul KV operations
type ConfigManager struct {
    client *api.Client
    prefix string
}

// NewConfigManager creates a new configuration manager
func NewConfigManager(address, prefix string) (*ConfigManager, error) {
    config := api.DefaultConfig()
    config.Address = address

    client, err := api.NewClient(config)
    if err != nil {
        return nil, err
    }

    return &ConfigManager{
        client: client,
        prefix: prefix,
    }, nil
}

// Get retrieves a string value from Consul KV
func (cm *ConfigManager) Get(key string) (string, error) {
    fullKey := cm.prefix + key

    pair, _, err := cm.client.KV().Get(fullKey, nil)
    if err != nil {
        return "", err
    }

    if pair == nil {
        return "", fmt.Errorf("key not found: %s", key)
    }

    return string(pair.Value), nil
}

// GetJSON retrieves and unmarshals a JSON value
func (cm *ConfigManager) GetJSON(key string, target interface{}) error {
    value, err := cm.Get(key)
    if err != nil {
        return err
    }

    return json.Unmarshal([]byte(value), target)
}

// Set stores a string value in Consul KV
func (cm *ConfigManager) Set(key, value string) error {
    fullKey := cm.prefix + key

    pair := &api.KVPair{
        Key:   fullKey,
        Value: []byte(value),
    }

    _, err := cm.client.KV().Put(pair, nil)
    return err
}

// SetJSON marshals and stores a value as JSON
func (cm *ConfigManager) SetJSON(key string, value interface{}) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }

    return cm.Set(key, string(data))
}

func main() {
    // Create configuration manager
    config, err := NewConfigManager("localhost:8500", "config/app/")
    if err != nil {
        log.Fatal(err)
    }

    // Store simple value
    err = config.Set("environment", "production")
    if err != nil {
        log.Fatal(err)
    }

    // Store structured data
    settings := map[string]interface{}{
        "max_connections": 100,
        "timeout":         30,
    }
    err = config.SetJSON("settings", settings)
    if err != nil {
        log.Fatal(err)
    }

    // Retrieve values
    env, _ := config.Get("environment")
    fmt.Printf("Environment: %s\n", env)

    var retrievedSettings map[string]interface{}
    config.GetJSON("settings", &retrievedSettings)
    fmt.Printf("Settings: %+v\n", retrievedSettings)
}
```

---

## Watching for Changes

### Python Watch Example

```python
import consul
import threading
import time

class ConfigWatcher:
    """
    Watches Consul KV for changes and triggers callbacks.
    Uses blocking queries for efficient change detection.
    """

    def __init__(self, host='localhost', port=8500):
        self.client = consul.Consul(host=host, port=port)
        self._watches = {}
        self._running = False

    def watch(self, key, callback):
        """
        Register a callback for when a key changes.
        Callback receives (key, old_value, new_value).
        """
        self._watches[key] = {
            'callback': callback,
            'index': 0,
            'value': None
        }

    def start(self):
        """Start watching all registered keys."""
        self._running = True

        for key in self._watches:
            thread = threading.Thread(
                target=self._watch_key,
                args=(key,),
                daemon=True
            )
            thread.start()

    def stop(self):
        """Stop all watches."""
        self._running = False

    def _watch_key(self, key):
        """Background thread that watches a single key."""
        watch = self._watches[key]

        while self._running:
            try:
                # Blocking query - waits until value changes or timeout
                index, data = self.client.kv.get(
                    key,
                    index=watch['index'],
                    wait='30s'  # Block for up to 30 seconds
                )

                # Check if index changed (value was modified)
                if index != watch['index']:
                    old_value = watch['value']
                    new_value = data['Value'].decode() if data else None

                    watch['index'] = index
                    watch['value'] = new_value

                    # Trigger callback if value actually changed
                    if old_value != new_value:
                        watch['callback'](key, old_value, new_value)

            except Exception as e:
                print(f"Watch error for {key}: {e}")
                time.sleep(1)


# Usage example
def on_config_change(key, old_value, new_value):
    print(f"Configuration changed!")
    print(f"  Key: {key}")
    print(f"  Old: {old_value}")
    print(f"  New: {new_value}")

watcher = ConfigWatcher()
watcher.watch('config/app/log_level', on_config_change)
watcher.watch('config/app/feature_flags', on_config_change)
watcher.start()

# Application continues running...
```

---

## Distributed Locking

Use Consul KV for distributed locks:

```python
import consul
import time
import uuid

class DistributedLock:
    """
    Implements distributed locking using Consul sessions and KV store.
    """

    def __init__(self, client, lock_key, ttl=15):
        self.client = client
        self.lock_key = lock_key
        self.ttl = ttl
        self.session_id = None

    def acquire(self, timeout=30):
        """
        Attempt to acquire the lock.
        Returns True if successful, False if timeout.
        """
        # Create a session for this lock attempt
        self.session_id = self.client.session.create(
            ttl=self.ttl,
            behavior='delete'  # Delete lock key when session dies
        )

        start_time = time.time()

        while time.time() - start_time < timeout:
            # Try to acquire lock using session
            acquired = self.client.kv.put(
                self.lock_key,
                self.session_id,
                acquire=self.session_id
            )

            if acquired:
                return True

            time.sleep(0.5)

        # Timeout - cleanup session
        self.client.session.destroy(self.session_id)
        self.session_id = None
        return False

    def release(self):
        """Release the lock."""
        if self.session_id:
            self.client.kv.put(
                self.lock_key,
                '',
                release=self.session_id
            )
            self.client.session.destroy(self.session_id)
            self.session_id = None

    def __enter__(self):
        if not self.acquire():
            raise Exception("Failed to acquire lock")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


# Usage
client = consul.Consul()
lock = DistributedLock(client, 'locks/database-migration')

with lock:
    # Only one instance runs this at a time
    print("Running database migration...")
    perform_migration()
```

---

## Best Practices

1. **Use meaningful key hierarchies** that reflect your organization structure
2. **Store configuration as JSON** for complex settings
3. **Implement watches** for dynamic configuration updates
4. **Use sessions for locks** to prevent deadlocks on failures
5. **Set appropriate TTLs** for temporary values
6. **Back up KV data** using `consul snapshot save`

---

## Conclusion

Consul KV provides a simple yet powerful solution for centralized configuration management. Combined with watches for real-time updates and sessions for distributed locking, it covers most configuration management needs without additional infrastructure.

Key takeaways:
- Store configuration hierarchically with meaningful prefixes
- Use blocking queries for efficient change detection
- Implement distributed locks with sessions
- Consider JSON for structured configuration data

With Consul KV in place, your services can share configuration dynamically and respond to changes in real-time.

---

*Need to monitor configuration changes and their impact on your services? [OneUptime](https://oneuptime.com) provides comprehensive observability for distributed systems.*
