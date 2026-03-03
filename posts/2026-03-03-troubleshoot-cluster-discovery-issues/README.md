# How to Troubleshoot Cluster Discovery Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Discovery, Troubleshooting, Debugging, Kubernetes

Description: A systematic guide to diagnosing and fixing cluster discovery issues in Talos Linux, covering common failures and their solutions.

---

Cluster discovery in Talos Linux usually works without any attention, but when it breaks, the symptoms can be confusing. New nodes might fail to join the cluster, KubeSpan might not establish tunnels, or the cluster might split-brain during a network partition. This guide gives you a systematic approach to diagnosing and fixing discovery issues.

## Symptoms of Discovery Problems

Before diving into debugging, recognize the symptoms that point to discovery issues:

- New nodes boot but never appear in `kubectl get nodes`
- KubeSpan peers stay in "unknown" state
- `talosctl get discoveredmembers` returns an empty list or is missing nodes
- Control plane nodes cannot form the etcd cluster during bootstrap
- Nodes intermittently disappear from and reappear in the cluster

## Step 1: Check Basic Discovery Status

Start with the fundamental checks:

```bash
# Is discovery enabled?
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A15 "discovery:"

# Are there any discovered members?
talosctl get discoveredmembers --nodes <node-ip>

# Check the cluster identity
talosctl get clusteridentity --nodes <node-ip>
```

If discovery is disabled, that explains everything. Enable it:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
      kubernetes:
        disabled: false
```

## Step 2: Check Controller Logs

The discovery controllers log their activity. This is your best source of detailed error information:

```bash
# Check discovery-related logs
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery

# Look for errors specifically
talosctl logs controller-runtime --nodes <node-ip> | grep -i "discovery.*error\|discovery.*fail"

# Check the last 100 lines for recent activity
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery | tail -100
```

Common log messages and what they mean:

- `"discovery service request failed"` - The node cannot reach the discovery endpoint
- `"failed to decrypt affiliate"` - Cluster secrets mismatch
- `"discovery members updated"` - Discovery is working (this is a normal message)

## Step 3: Network Connectivity to Discovery Service

If the node cannot reach the discovery endpoint, check network connectivity:

```bash
# Check if DNS resolves for the discovery endpoint
talosctl logs controller-runtime --nodes <node-ip> | grep -i "dns\|resolv"

# Check for network errors
talosctl dmesg --nodes <node-ip> | grep -i "net\|tcp\|tls"

# Check the node's network interfaces
talosctl get addresses --nodes <node-ip>

# Check routes
talosctl get routes --nodes <node-ip>
```

Common network issues:

**DNS resolution failure**: The node cannot resolve `discovery.talos.dev`. This happens when DNS is not configured correctly or the upstream DNS server is unreachable.

```bash
# Check DNS configuration
talosctl get resolvers --nodes <node-ip>

# Verify DNS is working
talosctl logs controller-runtime --nodes <node-ip> | grep "nameserver"
```

**Firewall blocking HTTPS**: The discovery service uses HTTPS (port 443). Make sure outbound HTTPS traffic is allowed.

**Proxy issues**: If your network uses an HTTP proxy, Talos needs to be configured to use it:

```yaml
machine:
  env:
    http_proxy: http://proxy.example.com:8080
    https_proxy: http://proxy.example.com:8080
    no_proxy: localhost,127.0.0.1,10.0.0.0/8
```

## Step 4: Cluster Identity Mismatch

Each Talos cluster has a unique identity derived from its secrets. If a node has different secrets from the rest of the cluster, it will register with a different cluster ID and will not discover other nodes.

```bash
# Compare cluster identity between nodes
talosctl get clusteridentity --nodes <node-1-ip>
talosctl get clusteridentity --nodes <node-2-ip>

# The IDs should match for nodes in the same cluster
```

If they do not match, the node was configured with different cluster secrets. Regenerate the configuration from the same secret bundle:

```bash
# Generate all node configs from the same secret bundle
talosctl gen secrets -o secrets.yaml
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --with-secrets secrets.yaml
```

## Step 5: TLS Certificate Issues

The discovery service requires HTTPS. If there are TLS issues, the connection will fail:

```bash
# Check for TLS errors in logs
talosctl logs controller-runtime --nodes <node-ip> | grep -i "tls\|certificate\|x509"
```

Common TLS issues:

**Clock skew**: If the node's clock is too far off, certificate validation fails:

```bash
# Check the node's time
talosctl time --nodes <node-ip>

# Compare with actual time
date -u
```

If the time is wrong, check NTP configuration:

```yaml
machine:
  time:
    servers:
      - time.cloudflare.com
      - pool.ntp.org
```

**Untrusted CA**: If using a self-hosted discovery service with a private CA, the CA certificate needs to be in the node's trust store.

## Step 6: Self-Hosted Discovery Service Issues

If you run your own discovery service, additional things can go wrong:

```bash
# Check if the discovery service is running
curl -k https://discovery.internal.example.com/healthz

# Check the discovery service logs
# (depends on how you deployed it)
kubectl logs -n talos-discovery -l app=discovery-service
```

**Service is down**: The discovery service might have crashed. Check logs and restart it.

**TLS termination issues**: If using a reverse proxy for TLS, verify the proxy is correctly forwarding requests:

```bash
# Test the backend directly
curl http://discovery-backend:3000/healthz

# Test through the proxy
curl https://discovery.internal.example.com/healthz
```

**Resource limits**: If the discovery service runs out of memory or is throttled by CPU limits, it will stop responding:

```bash
kubectl top pod -n talos-discovery
```

## Step 7: Kubernetes Registry Issues

If you are using the Kubernetes registry as a fallback:

```bash
# Check if node annotations contain discovery data
kubectl get nodes -o yaml | grep -A5 "discovery"

# Verify the Kubernetes API is healthy
kubectl cluster-info
kubectl get componentstatus
```

The Kubernetes registry only works when Kubernetes is running. During initial bootstrap, only the service registry is available.

## Step 8: Recovery Procedures

### Node Cannot Discover Existing Cluster

If a new node cannot find the cluster:

```bash
# Apply the config again, making sure secrets match
talosctl apply-config --insecure \
  --nodes <new-node-ip> \
  --file worker.yaml

# Wait and check
talosctl get discoveredmembers --nodes <new-node-ip>
```

### All Discovery Is Broken

If no nodes can discover each other:

```bash
# Check if the public discovery service is up
curl https://discovery.talos.dev/

# If using self-hosted, check your service
curl https://discovery.internal.example.com/healthz

# As a workaround, manually specify control plane endpoints
# in the machine config (does not require discovery)
```

### Stale Discovery Data

If discovery shows nodes that no longer exist:

```bash
# Wait for TTL expiration (entries expire automatically)
# The default TTL is around 30 minutes

# Verify current actual membership
kubectl get nodes
```

## Prevention

To avoid discovery issues in the future:

1. Monitor the discovery service endpoint (add it to your uptime monitoring)
2. Use both service and Kubernetes registries for redundancy
3. Keep cluster secrets backed up and consistent across all nodes
4. Ensure NTP is configured on all nodes for accurate time
5. For self-hosted services, set up proper health checks and alerting

```bash
# Simple monitoring check
#!/bin/bash
if ! talosctl get discoveredmembers --nodes <node-ip> -o json | jq -e 'length > 0' > /dev/null; then
  echo "ALERT: Discovery returning no members"
fi
```

Cluster discovery troubleshooting on Talos Linux follows a logical progression: check if it is enabled, check network connectivity, verify identity, and examine logs. The immutable nature of Talos means you rely heavily on `talosctl` for debugging, but the available tools are sufficient to diagnose virtually any discovery issue. When in doubt, the controller runtime logs are your best friend.
