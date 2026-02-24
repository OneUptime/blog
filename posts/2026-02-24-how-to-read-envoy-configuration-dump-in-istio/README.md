# How to Read Envoy Configuration Dump in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Configuration, Debugging, Kubernetes

Description: A detailed guide to understanding and navigating the Envoy configuration dump in Istio for advanced debugging of proxy behavior.

---

The Envoy configuration dump is the complete, raw configuration that controls how the sidecar proxy handles traffic. It is the final word on what the proxy is actually doing, as opposed to what you think it should be doing based on your Istio resources. When `istioctl proxy-config` commands do not give you enough detail, the config dump is where you go next.

The catch is that the config dump is huge and complex. A typical sidecar in a medium-sized mesh can have a config dump of 50,000+ lines of JSON. Knowing how to navigate it efficiently is a critical debugging skill.

## Getting the Config Dump

There are several ways to retrieve the configuration dump.

### Using istioctl

```bash
istioctl proxy-config all productpage-v1-6b746f74dc-9rlmh.bookinfo -o json > /tmp/config_dump.json
```

### Using pilot-agent

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /config_dump > /tmp/config_dump.json
```

### Using the Envoy Admin API Directly

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  curl -s localhost:15000/config_dump > /tmp/config_dump.json
```

## Structure of the Config Dump

The config dump is a JSON document with several top-level sections. Each section contains a different type of configuration:

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    configs = data.get('configs', [])
    for c in configs:
        print(c.get('@type', 'unknown'))
"
```

The main sections are:

1. **BootstrapConfigDump**: Static startup configuration
2. **ClustersConfigDump**: Upstream service definitions
3. **ListenersConfigDump**: Network listeners
4. **RoutesConfigDump**: HTTP routing rules
5. **SecretsConfigDump**: TLS certificates
6. **ScopedRoutesConfigDump**: Scoped route configurations (if used)
7. **EndpointsConfigDump**: Backend pod addresses

## Reading the Clusters Section

The clusters section defines every upstream service the proxy knows about. Extract it:

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'ClustersConfigDump' in config.get('@type', ''):
            static = config.get('static_clusters', [])
            dynamic = config.get('dynamic_active_clusters', [])
            print(f'Static clusters: {len(static)}')
            print(f'Dynamic clusters: {len(dynamic)}')
            for c in dynamic:
                cluster = c.get('cluster', {})
                name = cluster.get('name', 'unknown')
                ctype = cluster.get('type', 'unknown')
                print(f'  {name} ({ctype})')
"
```

Each cluster entry contains:

- **name**: The cluster name in the format `outbound|port|subset|hostname`
- **type**: How endpoints are discovered (EDS, STATIC, STRICT_DNS, ORIGINAL_DST)
- **connectTimeout**: How long to wait for a connection
- **circuitBreakers**: Connection pool and circuit breaker settings
- **transportSocket**: TLS configuration for upstream connections
- **loadAssignment**: For STATIC clusters, the actual endpoint addresses

### Finding a Specific Cluster

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'ClustersConfigDump' in config.get('@type', ''):
            for c in config.get('dynamic_active_clusters', []):
                cluster = c.get('cluster', {})
                if 'reviews' in cluster.get('name', ''):
                    print(json.dumps(cluster, indent=2))
"
```

## Reading the Listeners Section

Listeners define what ports the proxy accepts traffic on and how that traffic is processed. Extract them:

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'ListenersConfigDump' in config.get('@type', ''):
            static = config.get('static_listeners', [])
            dynamic = config.get('dynamic_listeners', [])
            print(f'Static listeners: {len(static)}')
            print(f'Dynamic listeners: {len(dynamic)}')
            for l in dynamic:
                active = l.get('active_state', {}).get('listener', {})
                name = active.get('name', 'unknown')
                addr = active.get('address', {}).get('socketAddress', {})
                print(f'  {name} - {addr.get(\"address\", \"?\")}:{addr.get(\"portValue\", \"?\")}')
"
```

Each listener contains filter chains, and each filter chain contains filters that process traffic. The most important filter is the HTTP connection manager, which contains the route configuration reference.

### Understanding Filter Chains

A listener can have multiple filter chains. Envoy selects the appropriate filter chain based on matching criteria like the destination IP, port, and transport protocol (TLS vs plaintext).

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'ListenersConfigDump' in config.get('@type', ''):
            for l in config.get('dynamic_listeners', []):
                active = l.get('active_state', {}).get('listener', {})
                name = active.get('name', '')
                if '15006' in name:  # Inbound listener
                    chains = active.get('filterChains', [])
                    print(f'Inbound listener has {len(chains)} filter chains')
                    for i, chain in enumerate(chains):
                        match = chain.get('filterChainMatch', {})
                        print(f'  Chain {i}: match={json.dumps(match)}')
"
```

## Reading the Routes Section

Routes define how HTTP requests are matched and forwarded to clusters:

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'RoutesConfigDump' in config.get('@type', ''):
            for rc in config.get('dynamic_route_configs', []):
                route_config = rc.get('route_config', {})
                name = route_config.get('name', 'unknown')
                vhosts = route_config.get('virtual_hosts', [])
                print(f'Route config: {name} ({len(vhosts)} virtual hosts)')
                for vh in vhosts:
                    domains = vh.get('domains', [])[:3]
                    routes = vh.get('routes', [])
                    print(f'  {domains} -> {len(routes)} routes')
"
```

Each virtual host groups routes by domain. Within each virtual host, routes are evaluated in order.

### Finding a Specific Route

To find how traffic to a specific service is routed:

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'RoutesConfigDump' in config.get('@type', ''):
            for rc in config.get('dynamic_route_configs', []):
                route_config = rc.get('route_config', {})
                for vh in route_config.get('virtual_hosts', []):
                    if any('reviews' in d for d in vh.get('domains', [])):
                        print(json.dumps(vh, indent=2))
"
```

## Reading the Secrets Section

Check certificate information:

```bash
python3 -c "
import json
with open('/tmp/config_dump.json') as f:
    data = json.load(f)
    for config in data.get('configs', []):
        if 'SecretsConfigDump' in config.get('@type', ''):
            for secret in config.get('dynamic_active_secrets', []):
                name = secret.get('name', 'unknown')
                last_updated = secret.get('last_updated', 'unknown')
                print(f'Secret: {name}, Last updated: {last_updated}')
"
```

## Practical Tips for Navigating Large Config Dumps

### Use jq for Quick Filtering

```bash
# List all cluster names
cat /tmp/config_dump.json | python3 -m json.tool | grep '"name":' | head -30

# Find circuit breaker settings
cat /tmp/config_dump.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for config in data.get('configs', []):
    if 'ClustersConfigDump' in config.get('@type', ''):
        for c in config.get('dynamic_active_clusters', []):
            cluster = c.get('cluster', {})
            cb = cluster.get('circuitBreakers', {})
            thresholds = cb.get('thresholds', [{}])[0]
            if thresholds.get('maxConnections', 0) < 4294967295:
                print(f'{cluster[\"name\"]}: maxConn={thresholds.get(\"maxConnections\")}')
"
```

### Compare Config Dumps Between Pods

When two pods behave differently, compare their configs:

```bash
kubectl exec pod-a -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /config_dump > /tmp/config-a.json

kubectl exec pod-b -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /config_dump > /tmp/config-b.json

# Compare cluster counts
for f in /tmp/config-a.json /tmp/config-b.json; do
  echo "$f:"
  python3 -c "
import json
with open('$f') as fh:
    data = json.load(fh)
    for config in data.get('configs', []):
        if 'ClustersConfigDump' in config.get('@type', ''):
            print(f'  Clusters: {len(config.get(\"dynamic_active_clusters\", []))}')
        if 'ListenersConfigDump' in config.get('@type', ''):
            print(f'  Listeners: {len(config.get(\"dynamic_listeners\", []))}')
"
done
```

### Using the include_eds Parameter

By default, the config dump does not include EDS (endpoint) data because it can be very large. To include it:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET "/config_dump?include_eds"
```

Only include EDS when you specifically need endpoint information, as it can make the dump much larger.

## When to Use Config Dump vs istioctl proxy-config

Use `istioctl proxy-config` for:
- Quick checks of specific configuration types
- Formatted, human-readable output
- Filtering by FQDN, port, or direction

Use the config dump for:
- Seeing the complete picture of all configuration
- Checking filter chain details and filter order
- Debugging issues that span multiple configuration types
- Comparing complete configurations between proxies
- When you need the exact Envoy-native configuration format

The config dump is the most detailed view you can get into what the proxy is doing. It is not the most user-friendly, but when the higher-level tools do not give you enough information, it is the definitive source of truth for understanding proxy behavior.
