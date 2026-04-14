# How to Fix Dapr GetConfiguration Unimplemented Error

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, API, Troubleshooting, gRPC

Description: Fix the Dapr GetConfiguration 'Unimplemented' error by configuring a proper configuration store component and using the correct API version.

---

The `GetConfiguration` unimplemented error occurs when your application calls the Dapr Configuration API but no configuration store component is set up, or when using the wrong API version or protocol.

## Understanding the Error

The error typically looks like:

```text
rpc error: code = Unimplemented
desc = method GetConfiguration not implemented
```

Or via HTTP:

```json
{
  "errorCode": "ERR_METHOD_NOT_FOUND",
  "message": "configuration store configstore is not configured"
}
```

This means either the Configuration API is disabled, there is no configuration component configured, or you are using the wrong API endpoint.

## Setting Up a Configuration Store Component

Create a configuration store component. Redis is the most common choice:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: false
```

Apply it:

```bash
kubectl apply -f configstore.yaml -n <namespace>
```

## Using the Correct API Version

The Configuration API is stable and uses the `v1.0` endpoint. Use the correct versioned endpoint:

```bash
# HTTP - get configuration
curl http://localhost:3500/v1.0/configuration/configstore?key=mykey

# Subscribe to configuration changes
curl http://localhost:3500/v1.0/configuration/configstore/subscribe?key=mykey
```

For gRPC, ensure your SDK version supports the GetConfiguration method:

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    config = d.get_configuration(
        store_name='configstore',
        keys=['mykey'],
        config_metadata={}
    )
    print(config.items['mykey'].value)
```

## Setting Configuration Values in Redis

Configuration values in Redis use a special value format that includes a version number. Set them using the Redis CLI:

```bash
redis-cli MSET mykey "myvalue||1"
# Format: <value>||<version>
```

You can set multiple keys at once:

```bash
redis-cli MSET mykey "myvalue||1" anotherkey "anothervalue||1"
```

## Enabling the Alpha API (Older Dapr Versions)

On older Dapr versions where the Configuration API was still in alpha, you may need to explicitly enable it in the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  api:
    allowed:
    - name: configuration
      version: v1alpha1
      protocol: http
```

In current Dapr versions (1.14+), the Configuration API is stable and does not require explicit enablement.

## SDK Version Compatibility

Ensure your Dapr SDK version supports the Configuration API. Check with:

```bash
pip show dapr
# or
npm list @dapr/dapr
```

Update to a version that supports the Configuration API (Dapr SDK 1.8+ for Python).

## Summary

The GetConfiguration unimplemented error is fixed by creating a valid configuration store component (such as `configuration.redis`), using the `v1.0` API endpoint, and ensuring your Dapr SDK version supports the Configuration API. Remember to pre-populate configuration values in Redis using the correct value format (`value||version`).
