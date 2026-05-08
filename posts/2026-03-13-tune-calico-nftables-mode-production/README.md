# How to Tune Calico in nftables Mode for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Performance, Production

Description: A guide to tuning Calico's nftables mode for production performance and stability.

---

## Introduction

Calico in nftables mode has different performance characteristics than iptables mode. nftables' atomic rule update model means policy changes take effect in a single transaction rather than a series of individual iptables commands. This reduces policy update latency and eliminates the brief inconsistency window that can occur with complex iptables policy updates.

Production tuning for nftables mode focuses on Felix parameters such as refresh intervals, route table management, and resource allocation, plus standard Linux conntrack capacity tuning for high-throughput clusters.

## Prerequisites

- Calico running in nftables mode
- kube-proxy running in nftables mode on Kubernetes 1.31+
- `kubectl` and `calicoctl` installed
- Nodes with Linux 5.13+ and `nft` 1.0.1+

## Step 1: Tune Felix Refresh Intervals

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "nftablesMode": "Enabled",
    "nftablesRefreshInterval": "90s",
    "routeRefreshInterval": "60s",
    "reportingInterval": "120s",
    "logSeverityScreen": "Warning"
  }}'
```

## Step 2: Tune nftables Connection Tracking

For high-throughput clusters, increase the nf_conntrack table size.

```bash
# On each node

cat >> /etc/sysctl.d/99-calico-nft.conf << EOF
net.netfilter.nf_conntrack_max = 1048576
net.netfilter.nf_conntrack_buckets = 262144
net.netfilter.nf_conntrack_tcp_timeout_established = 86400
EOF
sysctl -p /etc/sysctl.d/99-calico-nft.conf
```

## Step 3: Check nftables Set Usage for Large Clusters

nftables uses sets for efficient IP and port matching. There is no general nftables set-size sysctl to increase; instead, inspect set usage and monitor Felix apply latency as policy count grows.

```bash
# Count nftables set definitions on a node
sudo nft list ruleset | grep -c 'set '
```

## Step 4: Enable Prometheus Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "prometheusMetricsEnabled": true,
    "prometheusMetricsPort": 9091
  }}'
```

Monitor `felix_int_dataplane_apply_time_seconds` for nftables apply latency.

## Step 5: Optimize for Large Policy Counts

For clusters with hundreds of NetworkPolicy objects, inspect nftables set usage.

```bash
# Check the number of nftables elements on a node
sudo nft list ruleset | grep -c 'elements = {'
```

If element counts are growing quickly, consider consolidating policies using namespace selectors and compare Felix dataplane apply latency against your production baseline.

## Step 6: Verify Production Performance

```bash
# Test policy update latency
time kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: perf-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF
kubectl delete networkpolicy perf-test
```

There is no universal one-second target for every cluster size. Compare the result with your baseline and with the `felix_int_dataplane_apply_time_seconds` metric under normal production load.

## Conclusion

Tuning Calico in nftables mode for production combines Felix interval tuning with standard Linux connection tracking capacity checks and nftables ruleset inspection. nftables' atomic update model can improve policy update behavior compared with sequences of individual iptables commands, and the Prometheus metrics - particularly `felix_int_dataplane_apply_time_seconds` - are the key indicators of nftables performance under production load.
