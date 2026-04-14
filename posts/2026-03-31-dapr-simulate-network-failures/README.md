# How to Simulate Network Failures for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Network, Failure, Testing, Chaos Engineering

Description: Simulate network partitions, packet loss, and latency for Dapr services using tc, toxiproxy, and Chaos Mesh to verify retry and timeout behavior.

---

## Why Simulate Network Failures?

Dapr services communicate over the network between sidecars. Network failures - packet loss, high latency, connection resets - are inevitable in production. Simulating them locally and in staging ensures your resiliency policies actually work before an outage hits.

## Method 1: Use tc (Traffic Control) in a Dev Environment

Linux's `tc` command can add artificial latency, packet loss, and bandwidth limits to a network interface:

```bash
# Add 300ms latency to all outgoing traffic on eth0
sudo tc qdisc add dev eth0 root netem delay 300ms

# Add 10% packet loss
sudo tc qdisc add dev eth0 root netem loss 10%

# Add both latency and packet loss
sudo tc qdisc add dev eth0 root netem delay 200ms loss 5%

# Remove the rule
sudo tc qdisc del dev eth0 root
```

## Method 2: Use Toxiproxy

Toxiproxy is a programmable TCP proxy for simulating network conditions:

```bash
# Install toxiproxy
brew install toxiproxy
# or via docker
docker run -d -p 8474:8474 -p 6380:6380 ghcr.io/shopify/toxiproxy

# Create a proxy for Redis (used by Dapr state store)
toxiproxy-cli create redis-proxy --listen 0.0.0.0:6380 --upstream redis:6379

# Add 500ms latency to the proxy
toxiproxy-cli toxic add redis-proxy -t latency -a latency=500 -a jitter=100

# Add connection reset
toxiproxy-cli toxic add redis-proxy -t reset_peer -a timeout=1000

# Remove toxic
toxiproxy-cli toxic remove redis-proxy -n latency_downstream
```

Point your Dapr state store component at the Toxiproxy port:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6380"  # Toxiproxy port
```

## Method 3: Chaos Mesh NetworkChaos on Kubernetes

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: dapr-packet-loss
  namespace: default
spec:
  action: loss
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      dapr.io/enabled: "true"
  loss:
    loss: "20"
    correlation: "25"
  direction: to
  externalTargets:
    - redis-master.default.svc.cluster.local
  duration: "5m"
```

```bash
kubectl apply -f network-loss.yaml
```

## Verify Dapr Resiliency Fires

Check that Dapr's retry policy activates during the simulated failure:

```bash
# Watch sidecar logs for retry attempts
kubectl logs -l dapr.io/enabled=true -c daprd --since=2m | grep -i "retry\|timeout\|circuit"

# Check Prometheus metric for retries
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=dapr_resiliency_count{app_id="orderservice"}'
```

## Define a Resiliency Policy Before Testing

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: network-test-resiliency
spec:
  policies:
    timeouts:
      networkTimeout: 2s
    retries:
      networkRetry:
        policy: exponential
        maxRetries: 5
        maxInterval: 8s
  targets:
    components:
      statestore:
        outbound:
          timeout: networkTimeout
          retry: networkRetry
```

## Summary

Simulating network failures for Dapr services can be done with `tc` for local development, Toxiproxy for controlled proxy-level faults, or Chaos Mesh for Kubernetes-level network chaos. Combined with Dapr resiliency policies and metric monitoring, these techniques validate that your services remain stable under realistic network degradation.
