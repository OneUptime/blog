# How to Tune Calico on OpenStack Ubuntu for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Performance, Production

Description: A guide to performance-tuning Calico for high-density OpenStack deployments on Ubuntu.

---

## Introduction

Production tuning for Calico in Ubuntu OpenStack focuses on Felix's dataplane reconciliation overhead at high VM density, etcd cluster performance under write-heavy workloads during rapid VM creation, and BGP session stability under frequent routing table changes. Large OpenStack clusters can have thousands of VMs, each generating workload endpoint CRUD operations in etcd that Felix must process in real time.

Key tuning areas: Felix refresh intervals, etcd compaction and defragmentation scheduling, and BGP peering topology that balances convergence speed against stability.

## Prerequisites

- Calico running on an Ubuntu OpenStack cluster
- Root access to controller and compute nodes
- `calicoctl` installed

## Step 1: Tune Felix Refresh Intervals

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
cat <<'EOF' > /etc/cron.hourly/etcd-compact
#!/bin/bash
REVISION=$(ETCDCTL_API=3 etcdctl endpoint status --write-out="json" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['Status']['header']['revision'])")
ETCDCTL_API=3 etcdctl compact "$REVISION"
ETCDCTL_API=3 etcdctl defrag --cluster
EOF
chmod +x /etc/cron.hourly/etcd-compact
```

## Step 3: Tune BGP Peering

```bash
calicoctl patch bgpconfiguration default \
  --patch '{"spec":{"nodeToNodeMeshEnabled":true}}'
```

For large clusters (>200 nodes), disable node-to-node mesh and use route reflectors.

```bash
# Designate route reflectors
calicoctl patch node <route-reflector-node> \
  --patch '{"spec":{"bgp":{"routeReflectorClusterID":"244.0.0.1"}}}'

calicoctl label node <route-reflector-node> route-reflector=true

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-route-reflectors
spec:
  nodeSelector: all()
  peerSelector: route-reflector == 'true'
EOF

calicoctl patch bgpconfiguration default \
  --patch '{"spec":{"nodeToNodeMeshEnabled":false}}'
```

## Step 4: Set IP Pool Block Size for High VM Density

For large clusters with many VMs per compute node:

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: openstack-tenant-pool-large-blocks
spec:
  cidr: <new-non-overlapping-tenant-cidr>
  blockSize: 22
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: false
EOF
```

A block size of 22 gives 1024 IPs per block, reducing IPAM operations for high-density compute nodes. Calico block size is set when an IP pool is created; for an existing pool, migrate through a temporary non-overlapping pool, disable and delete the old pool, then recreate it with the desired block size.

## Step 5: Set BGP Prefix Communities

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

Production tuning for Calico on Ubuntu OpenStack centers on Felix refresh interval tuning, etcd compaction scheduling, BGP route reflector architecture for large clusters, and IP pool block size optimization for high VM density. These settings collectively ensure that Calico can keep up with the high rate of workload endpoint changes that large OpenStack clusters generate during periods of rapid VM creation and deletion.
