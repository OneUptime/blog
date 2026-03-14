# How to Tune Calico on OpenStack Red Hat for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Performance, Production

Description: A guide to performance-tuning Calico for production Red Hat-based OpenStack deployments.

---

## Introduction

Production tuning for Calico on RHEL OpenStack covers the same performance dimensions as Ubuntu (Felix event processing, etcd performance, BGP route reflection) with RHEL-specific additions: tuning RHEL's iptables-nft backend for better performance, configuring SELinux in an optimal way for Felix, and using RHEL's tuned profiles to optimize network performance on compute nodes.

RHEL's `tuned` service provides pre-built performance profiles that configure kernel networking parameters, CPU governors, and IRQ affinity. The `throughput-performance` or `network-throughput` profiles are good starting points for compute nodes running high-density VM workloads.

## Prerequisites

- Calico installed on RHEL OpenStack
- Root access to all nodes

## Step 1: Apply RHEL tuned Profile on Compute Nodes

```bash
sudo dnf install -y tuned
sudo tuned-adm profile throughput-performance
sudo tuned-adm active
```

## Step 2: Configure Felix Performance Settings

```ini
# /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://<controller-ip>:2379
LogSeverityScreen = Warning
PrometheusMetricsEnabled = true
PrometheusMetricsPort = 9091
RouteRefreshInterval = 60
IptablesRefreshInterval = 90
MaxIpsetSize = 10485760
```

```bash
sudo systemctl restart calico-felix
```

## Step 3: Configure etcd Performance on Controller

```bash
# Increase etcd election timeout for loaded controllers
sudo crudini --set /etc/etcd/etcd.conf "" ETCD_HEARTBEAT_INTERVAL 200
sudo crudini --set /etc/etcd/etcd.conf "" ETCD_ELECTION_TIMEOUT 1500

sudo systemctl restart etcd
```

## Step 4: Set Up Route Reflection for Large Clusters

For clusters with more than 100 compute nodes, use route reflection.

```bash
# Label designated route reflector nodes
calicoctl label node <controller-node> calico-route-reflector=true

calicoctl patch bgpconfiguration default \
  --patch '{"spec":{"nodeToNodeMeshEnabled":false}}'
```

## Step 5: Tune RHEL Network Stack

```bash
cat >> /etc/sysctl.d/99-openstack-calico.conf << EOF
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.netfilter.nf_conntrack_max = 1048576
net.netfilter.nf_conntrack_buckets = 262144
EOF
sysctl -p /etc/sysctl.d/99-openstack-calico.conf
```

## Step 6: Optimize SELinux for Performance

```bash
# Use targeted policy (default) rather than mls for better performance
sudo semanage module -l | grep calico
```

## Conclusion

Production tuning for Calico on RHEL OpenStack combines RHEL-specific optimization (tuned profiles, kernel network stack tuning, etcd timeout configuration) with platform-agnostic Calico tuning (Felix timer settings, route reflection for large clusters). The RHEL tuned profiles provide a convenient way to apply OS-level network optimizations across all compute nodes consistently.
