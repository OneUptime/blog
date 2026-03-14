# How to View Envoy Bootstrap Configuration with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Bootstrap, Istioctl, Kubernetes, Configuration

Description: Learn how to inspect the Envoy bootstrap configuration in Istio to debug proxy startup settings, control plane connectivity, and static resources.

---

The bootstrap configuration is the initial configuration that Envoy loads at startup, before it receives any dynamic configuration from Istiod. It defines fundamental settings like how to connect to the control plane, static clusters for internal communication, stats configuration, tracing setup, and admin interface settings.

Most of the time you won't need to look at bootstrap config. But when you're debugging control plane connectivity, tracing issues, or custom Envoy settings, this is where the answers are.

## Viewing Bootstrap Configuration

```bash
istioctl proxy-config bootstrap productpage-v1-abc123.default
```

The table output isn't very useful for bootstrap, so you'll almost always want JSON:

```bash
istioctl proxy-config bootstrap productpage-v1-abc123.default -o json
```

The output is large. Here are the important sections.

## Control Plane Connection

The bootstrap defines how Envoy connects to Istiod for dynamic configuration (xDS):

```json
{
  "dynamicResources": {
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
}
```

The `xds-grpc` cluster name references a static cluster in the bootstrap that points to Istiod:

```json
{
  "name": "xds-grpc",
  "type": "STRICT_DNS",
  "connectTimeout": "10s",
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
  },
  "transportSocket": {
    "name": "envoy.transport_sockets.tls",
    "typedConfig": {
      "commonTlsContext": {
        "tlsCertificateSdsSecretConfigs": [
          {
            "name": "default",
            "sdsConfig": {
              "apiConfigSource": {
                "apiType": "GRPC",
                "grpcServices": [
                  {
                    "envoyGrpc": {
                      "clusterName": "sds-grpc"
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }
}
```

This tells you:
- Envoy connects to `istiod.istio-system.svc` on port 15012
- The connection uses TLS with certificates managed by SDS (Secret Discovery Service)
- The cluster type is STRICT_DNS, meaning it resolves the DNS name on startup

If the proxy can't connect to Istiod, this is where you verify the address is correct. Common issues:

- Istiod DNS name doesn't resolve (kube-dns issues)
- Port 15012 is blocked by a NetworkPolicy
- TLS certificates are invalid or expired

## Admin Interface

The bootstrap configures Envoy's admin interface:

```json
{
  "admin": {
    "accessLogPath": "/dev/null",
    "profilePath": "/var/lib/istio/data/envoy.prof",
    "address": {
      "socketAddress": {
        "address": "127.0.0.1",
        "portValue": 15000
      }
    }
  }
}
```

This shows:
- Admin interface is on port 15000, bound to localhost only (not accessible externally)
- Access logs for the admin interface go to /dev/null
- CPU profiling data goes to /var/lib/istio/data/envoy.prof

You can access the admin interface through:

```bash
kubectl exec productpage-v1-abc123 -c istio-proxy -- curl -s localhost:15000/help
```

## Stats Configuration

The bootstrap defines how Envoy collects and exports metrics:

```json
{
  "statsConfig": {
    "statsTags": [
      {
        "tagName": "cluster_name",
        "regex": "^cluster\\.((.+?(\\..+?\\.svc\\.cluster\\.local)?)\\.)"
      },
      {
        "tagName": "tcp_prefix",
        "regex": "^tcp\\.((.*?)\\.)\\w+?$"
      },
      {
        "tagName": "response_code",
        "regex": ".*\\.response_code\\.(\\d{3})\\..*"
      },
      {
        "tagName": "response_code_class",
        "regex": ".*\\.response_code_class\\.(\\dxx)\\..*"
      }
    ],
    "useAllDefaultTags": false
  }
}
```

These regex patterns extract tags from Envoy's flat stat names and turn them into labeled metrics for Prometheus. If you're seeing weird metric labels or missing tags, check these patterns.

## Tracing Configuration

If distributed tracing is configured, it shows up in the bootstrap:

```json
{
  "tracing": {
    "http": {
      "name": "envoy.tracers.zipkin",
      "typedConfig": {
        "collectorCluster": "zipkin",
        "collectorEndpoint": "/api/v2/spans",
        "collectorEndpointVersion": "HTTP_JSON",
        "traceId128bit": true,
        "sharedSpanContext": false
      }
    }
  }
}
```

The tracing cluster is also defined as a static cluster in the bootstrap:

```json
{
  "name": "zipkin",
  "type": "STRICT_DNS",
  "connectTimeout": "10s",
  "loadAssignment": {
    "clusterName": "zipkin",
    "endpoints": [
      {
        "lbEndpoints": [
          {
            "endpoint": {
              "address": {
                "socketAddress": {
                  "address": "zipkin.istio-system",
                  "portValue": 9411
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

If traces aren't showing up, verify:
1. The tracing section exists in the bootstrap
2. The collector address and port are correct
3. The collector service is running

## Static Clusters

The bootstrap contains several static clusters that Envoy uses for internal communication:

- **xds-grpc** - Connection to Istiod for configuration
- **sds-grpc** - Connection to the SDS agent for certificates
- **zipkin** or **jaeger** - Tracing collector (if configured)
- **agent** - Connection to the local Istio agent (pilot-agent)
- **prometheus_stats** - Stats endpoint for Prometheus scraping

List all static clusters:

```bash
istioctl pc bootstrap productpage-v1-abc123.default -o json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(c['name']) for c in d.get('bootstrap',{}).get('staticResources',{}).get('clusters',[])]"
```

## Node Metadata

The bootstrap includes metadata about the proxy that gets sent to Istiod:

```json
{
  "node": {
    "id": "sidecar~10.244.0.15~productpage-v1-abc123.default~default.svc.cluster.local",
    "cluster": "productpage.default",
    "metadata": {
      "ANNOTATIONS": { ... },
      "APP_CONTAINERS": "productpage",
      "CLUSTER_ID": "Kubernetes",
      "INSTANCE_IPS": "10.244.0.15",
      "ISTIO_VERSION": "1.20.0",
      "LABELS": {
        "app": "productpage",
        "version": "v1"
      },
      "MESH_ID": "cluster.local",
      "NAME": "productpage-v1-abc123",
      "NAMESPACE": "default",
      "OWNER": "kubernetes://apis/apps/v1/namespaces/default/deployments/productpage-v1",
      "SERVICE_ACCOUNT": "bookinfo-productpage",
      "WORKLOAD_NAME": "productpage-v1"
    }
  }
}
```

This metadata is how Istiod identifies the proxy and determines what configuration to send. The node ID follows the format: `type~ip~podname.namespace~domain`.

If Istiod is sending wrong configuration, check this metadata. For example, if the namespace is wrong, the proxy will receive config for the wrong namespace.

## Comparing Bootstrap Between Proxies

When one pod works but another doesn't, comparing their bootstrap can reveal differences:

```bash
istioctl pc bootstrap working-pod.default -o json > bootstrap-working.json
istioctl pc bootstrap broken-pod.default -o json > bootstrap-broken.json
diff <(python3 -m json.tool bootstrap-working.json) <(python3 -m json.tool bootstrap-broken.json)
```

Differences in the xds-grpc cluster address (pointing to different Istiod instances), node metadata, or tracing config can explain different behavior.

## Customizing Bootstrap

You can customize the bootstrap through several mechanisms:

**Pod annotations:**

```yaml
annotations:
  proxy.istio.io/config: |
    tracing:
      zipkin:
        address: zipkin.monitoring:9411
    concurrency: 2
    drainDuration: 45s
```

**Mesh-wide defaults in IstioOperator:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        zipkin:
          address: zipkin.monitoring:9411
      concurrency: 2
      drainDuration: 45s
```

**ProxyConfig resource (per-workload):**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: productpage-config
  namespace: default
spec:
  selector:
    matchLabels:
      app: productpage
  concurrency: 4
```

After changing bootstrap configuration, pods need to be restarted since the bootstrap is only read at startup:

```bash
kubectl rollout restart deployment/productpage-v1 -n default
```

## Summary

The bootstrap configuration is the foundation that everything else builds on. It defines how Envoy connects to Istiod, how it reports metrics, where it sends traces, and what metadata identifies it. You won't check it often, but when you're debugging connectivity to the control plane, missing traces, or incorrect proxy identity, the bootstrap has the answers.
