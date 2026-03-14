# How to Tune Calico in nftables Mode for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Performance, Production

Description: A guide to tuning Calico's nftables mode for production performance and stability.

---

## Introduction

Calico in nftables mode has different performance characteristics than iptables mode. nftables' atomic rule update model means policy changes take effect in a single transaction rather than a series of individual iptables commands. This reduces policy update latency and eliminates the brief inconsistency window that can occur with complex iptables policy updates.

Production tuning for nftables mode focuses on the same Felix parameters as iptables mode — refresh intervals, route table management, and resource allocation — but also includes nftables-specific kernel tuning to handle large policy sets efficiently.

## Prerequisites

- Calico running in nftables mode
- `kubectl` and `calicoctl` installed
- Nodes with Linux 5.2+

## Step 1: Tune Felix Refresh Intervals

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "iptablesBackend": "nft",
    "iptablesRefreshInterval": "90s",
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

## Step 3: Configure Set Sizes for Large Clusters

nftables uses sets for IP and port matching. For clusters with many network policies, increase the default set element limits.

```bash
cat >> /etc/sysctl.d/99-nft-sets.conf << EOF
net.netfilter.nf_conntrack_expect_max = 4096
EOF
sysctl -p /etc/sysctl.d/99-nft-sets.conf
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

For clusters with hundreds of NetworkPolicy objects, verify nftables set lookup performance.

```bash
# Check the number of nftables elements on a node
nft list table ip calico-filter | grep elements | wc -l
```

If element counts are very high (>10000), consider consolidating policies using namespace selectors.

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

Policy application should complete in under 1 second in nftables mode.

## Conclusion

Tuning Calico in nftables mode for production combines Felix interval tuning (identical to iptables mode) with nftables-specific kernel parameters for connection tracking and set management. nftables' atomic update model provides better baseline performance for policy updates than iptables, and the Prometheus metrics — particularly `felix_int_dataplane_apply_time_seconds` — are the key indicators of nftables performance under production load.
