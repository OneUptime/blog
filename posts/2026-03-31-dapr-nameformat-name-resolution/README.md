# How to Configure NameFormat Name Resolution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Name Resolution, NameFormat, Service Discovery, Configuration

Description: Learn how to configure Dapr's NameFormat name resolution component to map app IDs to custom hostname patterns using template-based formatting.

---

## What Is NameFormat Name Resolution?

The `nameformat` name resolution component in Dapr allows you to define a custom hostname pattern that maps Dapr app IDs to network addresses. Instead of relying on dynamic discovery (mDNS, Consul, etc.), NameFormat uses simple string replacement to construct the target hostname from the app ID.

This is useful in environments where service hostnames follow predictable patterns, such as `{appid}.service.internal` or `{appid}.default.svc.cluster.local`.

## Basic Configuration

Configure NameFormat name resolution in a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "nameformat"
    version: "v1"
    configuration:
      format: "{appid}.services.internal"
```

With this configuration, an app ID of `order-service` resolves to `order-service.services.internal`.

## Using the Format Placeholder

The `format` field supports one placeholder:

- `{appid}` - replaced with the Dapr app ID at resolution time

Example targeting a specific Kubernetes namespace:

```yaml
configuration:
  format: "{appid}.production.svc.cluster.local"
```

An invocation of `order-service` resolves to:
`order-service.production.svc.cluster.local`

## Custom DNS Subdomain Example

For an environment where each service has a DNS entry in a custom subdomain:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "nameformat"
    version: "v1"
    configuration:
      format: "dapr-{appid}.internal.example.com"
```

With this pattern:
- `order-service` resolves to `dapr-order-service.internal.example.com`
- `payment-service` resolves to `dapr-payment-service.internal.example.com`

Ensure your DNS server has entries for each service matching this pattern.

## Applying the Configuration

For self-hosted mode, reference the configuration file when running your app:

```bash
dapr run --app-id order-service \
  --app-port 8080 \
  --config ./appconfig.yaml \
  -- ./order-service
```

For Kubernetes, apply the Configuration resource:

```bash
kubectl apply -f appconfig.yaml
```

Then annotate your deployment to use it:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Testing NameFormat Resolution

Start a service and verify it can resolve others:

```bash
dapr invoke --app-id payment-service \
  --method health \
  --verb GET
```

If resolution fails, check the resolved hostname manually:

```bash
nslookup dapr-payment-service.internal.example.com
```

Enable debug logging for more detail:

```bash
dapr run --app-id myapp --log-level debug \
  --components-path ./components -- ./myapp 2>&1 | grep -i resolve
```

## Comparison with Other Name Resolution Components

| Component | Best For |
|-----------|----------|
| `mdns` | Local development, same host |
| `kubernetes` | Kubernetes clusters |
| `consul` | Multi-cloud, bare metal |
| `sqlite` | Docker Compose, single host |
| `nameformat` | Predictable DNS patterns |

## Summary

The NameFormat name resolution component maps Dapr app IDs to hostnames using the `{appid}` placeholder in a format string. It is ideal for environments with predictable service hostname patterns. Configure the `format` field in a Dapr Configuration resource to match your infrastructure's DNS naming convention.
