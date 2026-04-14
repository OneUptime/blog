# How to Configure Dapr for Low-Bandwidth Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Network, Performance, Configuration, Optimization

Description: Optimize Dapr for low-bandwidth network environments by tuning message sizes, compression, batching, and sidecar communication settings.

---

## Challenges of Low-Bandwidth Environments

Dapr sidecars add network overhead through sidecar-to-sidecar communication, pub/sub messaging, and state store operations. In constrained environments - edge computing, remote sites, or metered connections - this overhead can become significant. Tuning Dapr's behavior reduces bandwidth consumption without sacrificing functionality.

## Enabling gRPC for Lower Overhead

gRPC uses Protocol Buffers (binary) instead of JSON, reducing payload sizes by 30-70%:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "edge-service"
        dapr.io/app-protocol: "grpc"
        dapr.io/app-port: "5001"
    spec:
      containers:
      - name: edge-service
        image: edge-service:latest
```

## Tuning Pub/Sub Message Settings

Configure message size limits in your pub/sub component to control network overhead:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: kafka:9092
    - name: maxMessageBytes
      value: "1048576"    # 1MB max message
    - name: consumeRetryInterval
      value: "200ms"
    - name: authType
      value: "none"
```

## Compressing State Store Payloads

For applications storing large objects, compress at the application level before saving state. Dapr does not provide built-in compression, so you handle it yourself and use a custom metadata tag to track the encoding:

```javascript
const zlib = require('zlib');

async function saveCompressedState(key, data) {
  const compressed = zlib.gzipSync(JSON.stringify(data));
  const encoded = compressed.toString('base64');

  await fetch(`http://localhost:3500/v1.0/state/statestore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ key, value: encoded, metadata: { compressed: 'gzip' } }])
  });
}
```

Note: The `metadata` field here is custom application metadata passed through to the state store. Your application must also decompress when reading the value back.

## Limiting Telemetry Data

Reduce observability data volume in low-bandwidth environments:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: low-bandwidth-config
spec:
  tracing:
    samplingRate: "0.01"  # Only 1% sampling
  metrics:
    enabled: false
```

Disable metrics entirely for the lowest overhead:

```yaml
dapr.io/enable-metrics: "false"
```

## Configuring Actor Runtime Settings

Reduce actor placement frequency to lower control-plane traffic. Actor runtime parameters are configured programmatically through your application code, not through the Configuration CRD. Enable the ActorStateTTL preview feature in your Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actor-config
spec:
  features:
    - name: ActorStateTTL
      enabled: true
```

Then configure actor timeouts and scan intervals in your application. For example, in .NET:

```csharp
builder.Services.AddActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(60);
    options.ActorScanInterval = TimeSpan.FromSeconds(30);
    options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(30);
    options.DrainRebalancedActors = true;
});
```

Longer idle timeouts reduce actor deactivation and reactivation churn, while less frequent scanning lowers placement table traffic.

## Optimizing State Operations

Use bulk operations to amortize per-request overhead:

```bash
# Bulk state save (one request instead of N)
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user:1", "value": {"name": "Alice"}},
    {"key": "user:2", "value": {"name": "Bob"}},
    {"key": "user:3", "value": {"name": "Carol"}}
  ]'
```

## Disabling Unnecessary Features

In bandwidth-constrained deployments, disable unused Dapr features:

```yaml
# Minimal annotation set for edge deployments
dapr.io/enabled: "true"
dapr.io/app-id: "edge-service"
dapr.io/enable-metrics: "false"
dapr.io/disable-builtin-k8s-secret-store: "true"
dapr.io/log-level: "warn"  # Reduce log verbosity
```

## Summary

Optimizing Dapr for low-bandwidth networks involves switching to gRPC (binary protocol), batching state and pub/sub operations, compressing large payloads, reducing telemetry sampling rates, and tuning actor intervals. These changes collectively can reduce Dapr-related network traffic by 50-80% in constrained environments while preserving core microservices communication functionality.
