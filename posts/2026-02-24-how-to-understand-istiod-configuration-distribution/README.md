# How to Understand Istiod Configuration Distribution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, xDS, Configuration, Envoy

Description: A deep look at how istiod distributes configuration to Envoy proxies via xDS, including the push pipeline, incremental updates, and how to verify configuration delivery.

---

One of the most important things istiod does is take Kubernetes resources (Services, Endpoints, VirtualServices, etc.) and translate them into Envoy configuration that gets pushed to every sidecar proxy in the mesh. This process is called configuration distribution, and understanding how it works is key to debugging routing issues, slow propagation, and configuration mismatches.

## The xDS Protocol

Istiod communicates with Envoy proxies using the xDS protocol over gRPC. xDS stands for "x Discovery Service" and includes several sub-protocols:

- **LDS (Listener Discovery Service)**: What ports Envoy listens on, inbound and outbound
- **RDS (Route Discovery Service)**: HTTP routing rules (from VirtualServices)
- **CDS (Cluster Discovery Service)**: Upstream service definitions (from Services and DestinationRules)
- **EDS (Endpoint Discovery Service)**: IP addresses for each upstream cluster
- **SDS (Secret Discovery Service)**: TLS certificates for mTLS

Each proxy establishes a gRPC stream to istiod and subscribes to these resources. When istiod has an update, it sends the new resources over the stream.

## The Push Pipeline

Here is the sequence from a Kubernetes event to Envoy having the new configuration:

### 1. Event Detection

Istiod watches the Kubernetes API server for changes to Services, Endpoints, and all Istio CRDs. When a watch event arrives:

```text
Event: VirtualService "reviews-route" updated in namespace "default"
```

### 2. Debouncing

The event is added to a push request queue. Istiod waits for more events to arrive (debounce window of 100ms by default). This prevents doing a push for every single event during a rollout.

### 3. Push Context Construction

After the debounce window, istiod builds a "push context" that represents the current state of all configuration. This includes:
- All Services and Endpoints
- All VirtualServices, DestinationRules, Gateways
- All security policies
- All Sidecar configurations

### 4. Affected Proxy Calculation

Istiod determines which proxies need updates. Not every change affects every proxy. For example, an EDS update for service A only needs to be pushed to proxies that have service A in their configuration.

Check which proxies were affected by the last push:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/push_status
```

### 5. Configuration Generation

For each affected proxy, istiod generates the appropriate xDS resources. This is the CPU-intensive step because it involves:
- Evaluating VirtualService match rules
- Applying DestinationRule traffic policies
- Filtering based on Sidecar resources (if configured)
- Applying AuthorizationPolicy rules
- Generating listeners, routes, clusters, and endpoints

### 6. xDS Push

The generated configuration is sent over the gRPC stream to each proxy. Envoy receives the update, validates it, and either ACKs (acknowledges) or NACKs (rejects) it.

## Verifying Configuration Delivery

### Check Sync Status

```bash
istioctl proxy-status
```

This shows the sync state for each xDS type per proxy:
- **SYNCED**: Proxy has the latest configuration
- **STALE**: Istiod has newer configuration that has not been delivered
- **NOT SENT**: This xDS type was not pushed to this proxy (normal for ECDS in many setups)

### Compare Istiod's View vs. Proxy's View

What istiod intends to send:

```bash
istioctl proxy-config routes productpage-v1-abc123.default -o json
```

What the proxy actually has:

```bash
kubectl exec productpage-v1-abc123 -c istio-proxy -- curl -s localhost:15000/config_dump
```

If these differ, there is a push delivery issue.

### Check Specific Resource Types

```bash
# Listeners (LDS)
istioctl proxy-config listeners productpage-v1-abc123.default

# Routes (RDS)
istioctl proxy-config routes productpage-v1-abc123.default

# Clusters (CDS)
istioctl proxy-config clusters productpage-v1-abc123.default

# Endpoints (EDS)
istioctl proxy-config endpoints productpage-v1-abc123.default
```

## Incremental vs. Full Pushes

Istiod supports two push modes:

**Full Push**: Sends the complete configuration for all requested resource types. Used when major configuration changes happen (VirtualService update, DestinationRule change).

**Incremental Push (Delta xDS)**: Sends only the changed resources. Used primarily for EDS updates when endpoints change.

Check which type of push is happening:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_pushes
```

```text
pilot_xds_pushes{type="cds"} 523
pilot_xds_pushes{type="eds"} 8921
pilot_xds_pushes{type="lds"} 523
pilot_xds_pushes{type="rds"} 523
```

EDS pushes are much more frequent than other types because endpoint IPs change constantly as pods come and go.

## The Sidecar Resource and Configuration Scoping

By default, every proxy receives configuration for every service in the mesh. The Sidecar resource limits what each proxy sees:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: reviews
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "default/ratings.default.svc.cluster.local"
```

With this Sidecar resource, proxies in the `reviews` namespace only receive:
- CDS/EDS for services in their own namespace
- CDS/EDS for services in istio-system
- CDS/EDS for the ratings service in the default namespace

This dramatically reduces the configuration size and the number of pushes each proxy receives.

Verify the scoped configuration:

```bash
istioctl proxy-config clusters reviews-v1-abc123.reviews | wc -l
```

Compare with a proxy that has no Sidecar scoping:

```bash
istioctl proxy-config clusters productpage-v1-abc123.default | wc -l
```

## Configuration Distribution Timing

Measure end-to-end configuration propagation time:

```bash
# Apply a change
kubectl apply -f my-virtualservice.yaml

# Watch for the push to complete
watch istioctl proxy-status
```

Or use the convergence time metric:

```promql
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

Typical convergence times:
- Small mesh (< 50 proxies): Under 1 second
- Medium mesh (50-500 proxies): 1-5 seconds
- Large mesh (500+ proxies): 5-30 seconds depending on throttling settings

## Debugging Configuration Mismatches

When a proxy has incorrect configuration, work through this checklist:

**1. Is the resource valid?**

```bash
istioctl validate -f my-resource.yaml
```

**2. Did istiod see the resource?**

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/configz | jq '.[] | select(.name == "my-virtualservice")'
```

**3. Did istiod include it in the push?**

Check the proxy config dump from istiod's perspective:

```bash
istioctl proxy-config routes my-pod.my-namespace -o json | jq '.[].virtualHosts[].routes[].match'
```

**4. Did the proxy receive it?**

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/config_dump | jq '.configs[] | select(."@type" | contains("RoutesConfigDump"))'
```

**5. Did the proxy accept it?**

Check for NACKs in istiod logs:

```bash
kubectl logs -n istio-system deploy/istiod | grep "NACK"
```

## Configuration Versioning

Every xDS push includes a version string. You can track which version a proxy has:

```bash
istioctl proxy-status
```

The output includes version information that lets you correlate which push each proxy received. If a proxy is many versions behind, its connection to istiod might be broken.

## Common Distribution Issues

**Slow propagation**: Usually caused by high debounce settings, push throttling, or istiod resource pressure. Check push timing metrics.

**Configuration not reaching specific proxies**: Check if the proxy's gRPC connection to istiod is healthy. Restart the pod if the connection is stuck.

**Old configuration persists**: Envoy caches configuration in memory. A stuck proxy will keep using old routes until it receives a new push or is restarted.

**Partial updates**: If some proxies get the update but others do not, check if they are connected to different istiod replicas and whether the configuration is consistent across replicas.

Understanding configuration distribution at this level of detail makes debugging Istio much more systematic. Instead of guessing why traffic is not routing correctly, you can trace the configuration from its Kubernetes source all the way to the Envoy proxy that is serving it.
