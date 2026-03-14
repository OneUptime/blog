# How to Configure Calico on OpenStack Ubuntu for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Configuration

Description: A guide to configuring Calico's BGP settings, tenant network configuration, and Felix parameters for a new Ubuntu-based OpenStack deployment.

---

## Introduction

After installing Calico on an Ubuntu OpenStack cluster, configuring it for production requires setting up BGP peering with physical routers, defining the IP ranges for tenant networks, and tuning Felix for the expected workload. OpenStack with Calico uses a flat network model where each tenant's virtual machine receives a routable IP from a pool - not a tunneled overlay IP. This simplifies routing but requires careful IP address planning.

The configuration touchpoints are the Neutron plugin settings (for OpenStack integration), the Felix configuration file (for Calico-level settings), and the BGP peer configuration (for advertising tenant IPs to physical switches).

## Prerequisites

- Calico installed on an Ubuntu OpenStack cluster
- `calicoctl` installed and configured
- Physical switches with BGP support (recommended)
- Tenant IP ranges planned and allocated

## Step 1: Configure Tenant IP Pool

Define the IP range that OpenStack tenants will receive.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: openstack-tenant-pool
spec:
  cidr: 10.65.0.0/16
  blockSize: 24
  natOutgoing: true
  disabled: false
EOF
```

## Step 2: Configure BGP for Tenant Networks

Set the ASN for the OpenStack cluster.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF
```

Add BGP peers for upstream physical routers.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-switch-1
spec:
  peerIP: 10.0.0.1
  asNumber: 65000
EOF
```

## Step 3: Configure Felix for OpenStack

```ini
# /etc/calico/felix.cfg
[global]
DatastoreType = etcdv3
EtcdEndpoints = http://<controller-ip>:2379
LogSeverityScreen = Warning
PrometheusMetricsEnabled = true
RoutingRulesSourceFT = kube
```

```bash
sudo systemctl restart calico-felix
```

## Step 4: Configure Neutron for Calico Networks

```ini
# /etc/neutron/plugins/ml2/ml2_conf.ini
[calico]
etcd_host = <controller-ip>
etcd_port = 2379
openstack_region = RegionOne
```

## Step 5: Verify BGP Peering

```bash
sudo calicoctl node status
```

BGP sessions should show `Established` for all configured peers.

## Step 6: Create a Test OpenStack Network

```bash
openstack network create test-calico-net
openstack subnet create --network test-calico-net \
  --subnet-range 10.65.1.0/24 \
  --ip-version 4 test-calico-subnet
openstack server create --network test-calico-net \
  --image cirros --flavor m1.tiny test-vm
```

## Conclusion

Configuring Calico for an Ubuntu OpenStack cluster involves defining tenant IP pools, enabling BGP peering with physical routers, tuning Felix for the OpenStack workload pattern, and verifying that OpenStack networks and VMs receive routable IPs. The BGP-based flat network model provides simpler operations and better performance than overlay-based approaches, at the cost of requiring IP address planning across the entire deployment.
