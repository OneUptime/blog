# How to Tune Calico on OpenStack Ubuntu for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Performance, Production

Description: A guide to performance-tuning Calico for high-density OpenStack deployments on Ubuntu.

---

## Introduction

Production tuning for Calico in Ubuntu OpenStack focuses on Felix's performance at high VM density, etcd cluster performance under write-heavy workloads during rapid VM creation, and BGP session stability under frequent routing table changes. Large OpenStack clusters can have thousands of VMs, each generating workload endpoint CRUD operations in etcd that Felix must process in real time.

Key tuning areas: Felix's event processing batch size, etcd compaction and defragmentation scheduling, and BGP timer values that balance convergence speed against stability.

## Prerequisites

- Calico running on an Ubuntu OpenStack cluster
- Root access to controller and compute nodes
- `calicoctl` installed

## Step 1: Tune Felix Event Processing

```ini
# /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://<controller-ip>:2379
LogSeverityScreen = Warning
PrometheusMetricsEnabled = true
PrometheusMetricsPort = 9091
RouteRefreshInterval = 30
IptablesRefreshInterval = 60
MaxIpsetSize = 10485760
```

Restart Felix on all compute nodes:

```bash
sudo systemctl restart calico-felix
```

## Step 2: Configure etcd Performance

```bash
# Schedule regular etcd compaction
cat <<EOF > /etc/cron.hourly/etcd-compact
#!/bin/bash
ETCDCTL_API=3 etcdctl compact $(etcdctl endpoint status --write-out="json" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['Status']['header']['revision'])")
ETCDCTL_API=3 etcdctl defrag
EOF
chmod +x /etc/cron.hourly/etcd-compact
```

## Step 3: Tune BGP Timers

```bash
calicoctl patch bgpconfiguration default \
  --patch '{"spec":{"nodeToNodeMeshEnabled":true}}'
```

For large clusters (>200 nodes), disable node-to-node mesh and use route reflectors.

```bash
# Designate route reflectors
kubectl label node <control-node> calico-route-reflector=true

calicoctl patch bgpconfiguration default \
  --patch '{"spec":{"nodeToNodeMeshEnabled":false}}'
```

## Step 4: Set IP Pool Block Size for High VM Density

For large clusters with many VMs per compute node:

```bash
calicoctl patch ippool openstack-tenant-pool \
  --patch '{"spec":{"blockSize":22}}'
```

A block size of 22 gives 1024 IPs per block, reducing IPAM operations for high-density compute nodes.

## Step 5: Enable iBGP Route Aggregation

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  prefixAdvertisements:
    - cidr: 10.65.0.0/16
      communities:
        - 64512:100
EOF
```

## Conclusion

Production tuning for Calico on Ubuntu OpenStack centers on Felix event processing batch sizing, etcd compaction scheduling, BGP route reflector architecture for large clusters, and IP pool block size optimization for high VM density. These settings collectively ensure that Calico can keep up with the high rate of workload endpoint changes that large OpenStack clusters generate during periods of rapid VM creation and deletion.
