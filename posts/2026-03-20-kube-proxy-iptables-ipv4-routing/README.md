# How to Configure kube-proxy in iptables Mode for IPv4 Service Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kube-proxy, iptables, IPv4, Service Routing, Networking

Description: Configure and understand kube-proxy's iptables mode for IPv4 Kubernetes service routing, including how to tune it for performance and debug rule issues.

On Linux, kube-proxy defaults to iptables mode when `mode` is unspecified. It programs iptables DNAT rules to intercept ClusterIP traffic and forward it to pod endpoints.

## How iptables Mode Works

```text
Pod sends to ClusterIP 10.96.45.123:80
→ iptables KUBE-SERVICES chain intercepts
→ KUBE-SVC-xxx chain selects random endpoint
→ KUBE-SEP-xxx chain DNATs to pod IP:port
→ Packet delivered to pod
```

## Verifying iptables Mode is Active

```bash
# Check kube-proxy configuration

kubectl get configmap kube-proxy -n kube-system -o jsonpath='{.data.config\.conf}' | grep '^mode:'
# Expected: mode: "iptables" (or mode: "", which defaults to iptables on Linux)

# Or check the running proxy mode from a node shell
curl http://localhost:10249/proxyMode
# Expected: iptables
```

## Configuring iptables Mode Explicitly

```yaml
# kube-proxy-config.yaml
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "iptables"
# Sync interval for iptables rules
iptables:
  # Minimum interval between syncs (default: 1s)
  minSyncPeriod: 1s
  # Periodic resync and cleanup interval (default: 30s)
  syncPeriod: 30s
  # FWMark bit kube-proxy uses for SNAT
  masqueradeBit: 14
  masqueradeAll: false
```

On kubeadm-managed clusters, edit the ConfigMap:

```bash
kubectl edit configmap kube-proxy -n kube-system
# Update the data.config.conf block, then restart kube-proxy
kubectl rollout restart daemonset/kube-proxy -n kube-system
```

## Viewing kube-proxy iptables Rules

```bash
# Main service routing chains
sudo iptables -t nat -L KUBE-SERVICES -n

# View a specific service's chain (get chain name from above)
sudo iptables -t nat -L KUBE-SVC-XXXXXXXXXXXX -n

# View endpoint chains (DNAT rules)
sudo iptables -t nat -L KUBE-SEP-XXXXXXXXXXXX -n

# Count all iptables rules on the node
sudo iptables-save | grep -c "^-"

# View statistics on a rule (how many packets matched)
sudo iptables -t nat -L KUBE-SERVICES -n -v
```

## Performance Considerations

In very large clusters with tens of thousands of Services or endpoints, iptables mode has scalability limits:

```bash
# Check how many iptables rules exist on the node
sudo iptables-save | grep -c "^-A"

# On a node, inspect kube-proxy rule sync duration metrics
curl -s http://127.0.0.1:10249/metrics | grep sync_proxy_rules_duration_seconds
```

## Tuning iptables Synchronization

```yaml
# In very large clusters, only raise minSyncPeriod if metrics show slow rule syncs
iptables:
  minSyncPeriod: 5s
  syncPeriod: 30s
```

## Cleaning Up Stale Rules

```bash
# kube-proxy normally cleans up stale rules automatically
# To force a full resync:
kubectl rollout restart daemonset/kube-proxy -n kube-system

# If kube-proxy is broken and you need emergency cleanup, run this on the node:
# kube-proxy --cleanup
```

For very large Linux clusters, consider `nftables` mode on kernels 5.13+ instead; IPVS mode is deprecated in current Kubernetes releases.
