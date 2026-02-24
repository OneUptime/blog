# How to Use istioctl proxy-config bootstrap for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, istioctl, Envoy, Bootstrap, Kubernetes

Description: How to inspect the Envoy bootstrap configuration with istioctl proxy-config bootstrap to debug proxy initialization and control plane connectivity.

---

The bootstrap configuration is the initial configuration that Envoy loads when it starts up. It defines how the proxy connects to the Istio control plane (istiod), what tracing and stats backends to use, and various runtime settings. Unlike the dynamic configuration (clusters, listeners, routes, endpoints) that changes during the proxy's lifetime, the bootstrap configuration is static and set at startup.

When a sidecar proxy is not connecting to the control plane, not sending telemetry, or has unexpected global settings, the bootstrap configuration is where you need to look.

## Basic Usage

```bash
istioctl proxy-config bootstrap <pod-name>.<namespace>
```

Example:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo
```

This outputs a large JSON document. You will usually want to pipe it through a JSON formatter:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | python3 -m json.tool
```

## Key Sections of the Bootstrap Configuration

### Control Plane Connection (ADS)

The most important part of the bootstrap is how the proxy connects to istiod for dynamic configuration:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
bootstrap = data.get('bootstrap', data)
dcs = bootstrap.get('dynamicResources', {})
print(json.dumps(dcs, indent=2))
"
```

You will see the ADS (Aggregated Discovery Service) configuration:

```json
{
  "adsConfig": {
    "apiType": "GRPC",
    "transportApiVersion": "V3",
    "grpcServices": [
      {
        "envoyGrpc": {
          "clusterName": "xds-grpc"
        }
      }
    ]
  }
}
```

The `xds-grpc` cluster name refers to the bootstrap static cluster that connects to istiod.

### Static Clusters

The bootstrap defines a few static clusters that are available before dynamic configuration loads:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
bootstrap = data.get('bootstrap', data)
static = bootstrap.get('staticResources', {}).get('clusters', [])
for c in static:
    print(f\"Cluster: {c['name']}, Type: {c.get('type', 'N/A')}\")
"
```

Typical static clusters include:

- **xds-grpc**: Connection to istiod for xDS configuration
- **sds-grpc**: Secret Discovery Service for certificates
- **agent**: The local pilot-agent for health checks and cert management
- **prometheus_stats**: Local stats endpoint
- **zipkin**: Tracing backend (if configured)

### Tracing Configuration

Check if tracing is configured and where traces are sent:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  grep -A20 "tracing"
```

You might see something like:

```json
{
  "tracing": {
    "http": {
      "name": "envoy.tracers.zipkin",
      "typedConfig": {
        "collectorCluster": "zipkin",
        "collectorEndpoint": "/api/v2/spans",
        "collectorEndpointVersion": "HTTP_JSON"
      }
    }
  }
}
```

If tracing is not working, this is the first place to check. Verify the collector cluster exists and points to the right address.

### Stats Configuration

The bootstrap defines how Envoy exposes statistics:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  grep -A30 "statsConfig"
```

This shows:
- Which stats tags are included (source/destination workload, namespace, etc.)
- What prefix is used for stats
- Which stats sinks are configured (Prometheus, StatsD, etc.)

### Admin Interface

The Envoy admin interface configuration:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  grep -A10 "admin"
```

```json
{
  "admin": {
    "accessLog": [
      {
        "name": "envoy.access_loggers.file",
        "typedConfig": {
          "path": "/dev/null"
        }
      }
    ],
    "address": {
      "socketAddress": {
        "address": "127.0.0.1",
        "portValue": 15000
      }
    }
  }
}
```

The admin interface runs on port 15000 and is bound to localhost only for security.

## Debugging Common Issues

### Proxy Not Connecting to istiod

If the proxy cannot reach istiod, check the xds-grpc static cluster:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
bootstrap = data.get('bootstrap', data)
for cluster in bootstrap.get('staticResources', {}).get('clusters', []):
    if cluster['name'] == 'xds-grpc':
        print(json.dumps(cluster, indent=2))
"
```

Look for the load assignment to see what address and port istiod is configured at:

```json
{
  "loadAssignment": {
    "clusterName": "xds-grpc",
    "endpoints": [
      {
        "lbEndpoints": [
          {
            "endpoint": {
              "address": {
                "socketAddress": {
                  "address": "istiod.istio-system.svc",
                  "portValue": 15012
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

If the address or port is wrong, the proxy was configured incorrectly at injection time. Check the istio-sidecar-injector ConfigMap:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml | grep discoveryAddress
```

### Wrong Istio Revision

If you have multiple Istio revisions installed, the bootstrap shows which control plane the proxy is configured to use. Check the xds-grpc cluster address.

### Certificate Issues

If mTLS certificates are not being issued, check the SDS configuration in the bootstrap:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  grep -A20 "sds-grpc"
```

The SDS cluster should point to the local pilot-agent on a Unix domain socket. If this configuration is wrong, the proxy cannot get its mTLS certificates.

### Custom Envoy Filters Not Loading

If you applied an EnvoyFilter but it is not taking effect, check if the bootstrap shows any errors:

```bash
kubectl logs productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo | grep "bootstrap"
```

EnvoyFilters that modify bootstrap configuration are applied at pod startup. If the pod was already running when you created the EnvoyFilter, you need to restart it.

## Comparing Bootstrap Across Pods

If two pods with the same configuration behave differently, compare their bootstrap:

```bash
istioctl proxy-config bootstrap pod-a.namespace -o json > /tmp/bootstrap-a.json
istioctl proxy-config bootstrap pod-b.namespace -o json > /tmp/bootstrap-b.json
diff /tmp/bootstrap-a.json /tmp/bootstrap-b.json
```

Differences could indicate that the pods were injected at different times (before and after a configuration change) or with different revisions.

## Mesh-Wide Settings in Bootstrap

Some mesh-wide settings from the IstioOperator or MeshConfig end up in every proxy's bootstrap:

```bash
istioctl proxy-config bootstrap productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  grep -i "concurrency\|drainDuration\|parentShutdownDuration"
```

These settings control proxy thread count, graceful shutdown timing, and other operational parameters.

The bootstrap configuration is not something you need to check often, but when you do need it, nothing else will give you the information. It is the foundation that everything else in the proxy depends on. If the bootstrap is wrong, the proxy cannot get its dynamic configuration, cannot get certificates, and cannot report telemetry.
