# How to Implement NATS KV Store for Distributed Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NATS, Configuration, Key-Value Store

Description: Learn how to use NATS JetStream KV store for distributed configuration management, feature flags, and shared state across microservices in Kubernetes environments.

---

NATS JetStream includes a built-in key-value store that provides distributed, replicated storage with watch capabilities. Unlike traditional configuration systems, NATS KV leverages JetStream's streaming foundation to offer real-time updates, historical versioning, and seamless integration with existing NATS messaging infrastructure.

In this guide, you'll learn how to use NATS KV store for configuration management, implement feature flags, track configuration history, and build reactive applications that respond to configuration changes.

## Understanding NATS KV Store

NATS KV store provides:

- **Distributed key-value storage** - Replicated across cluster nodes
- **Watch for changes** - Real-time notifications on updates
- **History tracking** - Access previous versions of values
- **TTL support** - Automatic expiration of keys
- **Conditional updates** - CAS (Compare-And-Swap) operations
- **Built on JetStream** - Leverages stream replication and persistence

Ideal for:
- Application configuration
- Feature flags
- Service discovery metadata
- Distributed locks and coordination
- Cached reference data

## Creating KV Buckets

Create a KV bucket using NATS CLI:

```bash
kubectl run nats-box --image=natsio/nats-box:latest --rm -it -- sh

# Inside the container
nats kv add CONFIG \
  --replicas 3 \
  --history 10 \
  --ttl 0
```

Create buckets programmatically:

```go
package main

import (
    "log"
    "github.com/nats-io/nats.go"
)

func main() {
    nc, _ := nats.Connect("nats://nats.nats.svc.cluster.local:4222")
    defer nc.Close()

    js, _ := nc.JetStream()

    // Create KV bucket
    kv, err := js.CreateKeyValue(&nats.KeyValueConfig{
        Bucket:   "app_config",
        History:  10,      // Keep 10 versions
        TTL:      0,       // No expiration
        Replicas: 3,       // 3 replicas for HA
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Created KV bucket: %s", kv.Bucket())
}
```

## Storing and Retrieving Configuration

Basic operations:

```go
func manageConfig(kv nats.KeyValue) {
    // Put value
    revision, err := kv.Put("database.host", []byte("postgres.default.svc"))
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Stored value at revision: %d", revision)

    // Get value
    entry, err := kv.Get("database.host")
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Value: %s, Revision: %d", string(entry.Value()), entry.Revision())

    // Update value
    kv.Put("database.host", []byte("postgres-ha.default.svc"))

    // Delete value
    kv.Delete("database.host")
}
```

Python example:

```python
import asyncio
from nats.aio.client import Client as NATS

async def manage_config():
    nc = NATS()
    await nc.connect("nats://nats.nats.svc.cluster.local:4222")

    js = nc.jetstream()
    kv = await js.create_key_value(bucket="app_config", history=10, replicas=3)

    # Put configuration
    await kv.put("api.rate_limit", b"1000")

    # Get configuration
    entry = await kv.get("api.rate_limit")
    print(f"Rate limit: {entry.value.decode()}")

    await nc.close()

asyncio.run(manage_config())
```

## Implementing Feature Flags

Create a feature flag system:

```go
package main

import (
    "encoding/json"
    "log"
    "github.com/nats-io/nats.go"
)

type FeatureFlag struct {
    Enabled     bool     `json:"enabled"`
    Rollout     int      `json:"rollout"`  // Percentage
    AllowedUsers []string `json:"allowed_users"`
}

func setFeatureFlag(kv nats.KeyValue, name string, flag FeatureFlag) error {
    data, _ := json.Marshal(flag)
    _, err := kv.Put("features."+name, data)
    return err
}

func getFeatureFlag(kv nats.KeyValue, name string) (*FeatureFlag, error) {
    entry, err := kv.Get("features." + name)
    if err != nil {
        return nil, err
    }

    var flag FeatureFlag
    json.Unmarshal(entry.Value(), &flag)
    return &flag, nil
}

func isFeatureEnabled(kv nats.KeyValue, featureName string, userID string) bool {
    flag, err := getFeatureFlag(kv, featureName)
    if err != nil {
        return false
    }

    if !flag.Enabled {
        return false
    }

    // Check if user is in allowed list
    for _, allowed := range flag.AllowedUsers {
        if allowed == userID {
            return true
        }
    }

    // Check rollout percentage
    // In production, use consistent hashing
    return (hash(userID) % 100) < flag.Rollout
}

func main() {
    nc, _ := nats.Connect("nats://nats:4222")
    defer nc.Close()

    js, _ := nc.JetStream()
    kv, _ := js.KeyValue("app_config")

    // Enable feature for 50% rollout
    setFeatureFlag(kv, "new_ui", FeatureFlag{
        Enabled:      true,
        Rollout:      50,
        AllowedUsers: []string{"admin", "beta_tester"},
    })

    // Check feature
    if isFeatureEnabled(kv, "new_ui", "user123") {
        log.Println("New UI enabled for user")
    }
}
```

## Watching for Configuration Changes

Implement real-time configuration updates:

```go
func watchConfig(kv nats.KeyValue) {
    // Watch all keys in bucket
    watcher, err := kv.WatchAll()
    if err != nil {
        log.Fatal(err)
    }
    defer watcher.Stop()

    log.Println("Watching for configuration changes...")

    for entry := range watcher.Updates() {
        if entry == nil {
            break
        }

        switch entry.Operation() {
        case nats.KeyValuePut:
            log.Printf("Config updated: %s = %s", entry.Key(), string(entry.Value()))
            // Reload configuration
            reloadConfig(entry.Key(), entry.Value())
        case nats.KeyValueDelete:
            log.Printf("Config deleted: %s", entry.Key())
        }
    }
}

func reloadConfig(key string, value []byte) {
    // Update application configuration dynamically
    switch key {
    case "database.host":
        updateDatabaseConnection(string(value))
    case "api.rate_limit":
        updateRateLimit(string(value))
    }
}
```

Watch specific keys:

```go
// Watch single key
watcher, _ := kv.Watch("database.host")

// Watch keys with prefix
watcher, _ := kv.Watch("features.")
```

## Implementing Distributed Locks

Use KV store for coordination:

```go
func acquireLock(kv nats.KeyValue, lockName string, ttl time.Duration) (bool, error) {
    lockKey := "locks." + lockName
    timestamp := time.Now().Unix()

    // Try to create lock (fails if exists)
    _, err := kv.Create(lockKey, []byte(fmt.Sprintf("%d", timestamp)))
    if err != nil {
        return false, nil // Lock already held
    }

    // Set TTL
    kv.Put(lockKey, []byte(fmt.Sprintf("%d", timestamp)))

    return true, nil
}

func releaseLock(kv nats.KeyValue, lockName string) error {
    lockKey := "locks." + lockName
    return kv.Delete(lockKey)
}

// Usage
func processWithLock(kv nats.KeyValue) {
    if acquired, _ := acquireLock(kv, "process_job", 30*time.Second); acquired {
        defer releaseLock(kv, "process_job")

        // Do work while holding lock
        processJob()
    } else {
        log.Println("Could not acquire lock, another process is running")
    }
}
```

## Accessing Configuration History

Retrieve previous versions:

```go
func viewHistory(kv nats.KeyValue, key string) {
    // Get current value
    current, _ := kv.Get(key)
    log.Printf("Current (rev %d): %s", current.Revision(), string(current.Value()))

    // Get specific revision
    previous, _ := kv.GetRevision(key, current.Revision()-1)
    if previous != nil {
        log.Printf("Previous (rev %d): %s", previous.Revision(), string(previous.Value()))
    }

    // Get history
    history, _ := kv.History(key)
    for _, entry := range history {
        log.Printf("Rev %d: %s (created: %v)",
            entry.Revision(),
            string(entry.Value()),
            entry.Created())
    }
}
```

## Implementing Conditional Updates

Use Compare-And-Swap for safe updates:

```go
func updateWithCAS(kv nats.KeyValue, key string) {
    // Get current value
    entry, _ := kv.Get(key)
    currentRevision := entry.Revision()

    // Modify value
    newValue := []byte("updated_value")

    // Update only if revision hasn't changed
    _, err := kv.Update(key, newValue, currentRevision)
    if err != nil {
        log.Println("Update failed: value was modified by another process")
    } else {
        log.Println("Update succeeded")
    }
}
```

## Building Configuration Management Service

Create a configuration service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: config-service
  namespace: default
spec:
  selector:
    app: config-service
  ports:
  - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: config-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: config-service
  template:
    metadata:
      labels:
        app: config-service
    spec:
      containers:
      - name: service
        image: config-service:latest
        env:
        - name: NATS_URL
          value: nats://nats.nats.svc.cluster.local:4222
        ports:
        - containerPort: 8080
```

Service implementation:

```go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/nats-io/nats.go"
)

var kv nats.KeyValue

func main() {
    nc, _ := nats.Connect("nats://nats:4222")
    defer nc.Close()

    js, _ := nc.JetStream()
    kv, _ = js.KeyValue("app_config")

    r := gin.Default()

    r.GET("/config/:key", getConfig)
    r.PUT("/config/:key", putConfig)
    r.DELETE("/config/:key", deleteConfig)

    r.Run(":8080")
}

func getConfig(c *gin.Context) {
    key := c.Param("key")
    entry, err := kv.Get(key)
    if err != nil {
        c.JSON(404, gin.H{"error": "Key not found"})
        return
    }

    c.JSON(200, gin.H{
        "key":      key,
        "value":    string(entry.Value()),
        "revision": entry.Revision(),
    })
}

func putConfig(c *gin.Context) {
    key := c.Param("key")
    var body struct {
        Value string `json:"value"`
    }

    if err := c.BindJSON(&body); err != nil {
        c.JSON(400, gin.H{"error": "Invalid request"})
        return
    }

    revision, _ := kv.Put(key, []byte(body.Value))
    c.JSON(200, gin.H{"revision": revision})
}

func deleteConfig(c *gin.Context) {
    key := c.Param("key")
    kv.Delete(key)
    c.JSON(204, nil)
}
```

## Monitoring KV Store Health

Create alerts for KV operations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nats-kv-alerts
spec:
  groups:
  - name: nats-kv
    rules:
    - alert: KVBucketHighUsage
      expr: |
        nats_kv_bucket_bytes > 1000000000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "KV bucket high storage usage"

    - alert: KVWatcherLagging
      expr: |
        nats_kv_watcher_pending > 1000
      for: 5m
      labels:
        severity: warning
```

## Best Practices

Follow these practices:

1. **Use appropriate history** - Balance versioning needs with storage
2. **Implement watch handlers** - React to configuration changes dynamically
3. **Set TTLs for temporary data** - Auto-cleanup ephemeral keys
4. **Use namespaces** - Organize keys with prefixes (app.db.*, app.cache.*)
5. **Monitor bucket size** - Alert on excessive storage growth
6. **Test failure scenarios** - Verify behavior during disconnections
7. **Document key schemas** - Maintain clear key naming conventions

## Conclusion

NATS KV store provides a powerful foundation for distributed configuration management in Kubernetes. By leveraging JetStream's replication, implementing watch patterns for reactive updates, and using versioning for auditing, you build robust configuration systems.

The combination of simplicity, performance, and integration with NATS messaging makes KV store an excellent choice for feature flags, service discovery, and dynamic configuration in cloud-native applications.
