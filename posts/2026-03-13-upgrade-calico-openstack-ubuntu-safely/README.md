# How to Upgrade Calico on OpenStack Ubuntu Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Upgrade

Description: A safe procedure for upgrading Calico on an Ubuntu OpenStack deployment while maintaining VM networking continuity.

---

## Introduction

Upgrading Calico in an Ubuntu OpenStack deployment requires upgrading the Calico Neutron plugin on the controller and the Felix agent on all compute nodes. The compute node upgrades are the most sensitive - restarting Felix on a compute node causes a brief pause in policy updates for VMs on that node. During the restart, existing network connections are maintained (iptables rules persist), but new policy changes are not applied until Felix restarts successfully.

Upgrading compute nodes one at a time and verifying VM connectivity on each node before proceeding to the next is the safest approach.

## Prerequisites

- Calico installed on an Ubuntu OpenStack cluster
- Root access to controller and compute nodes
- A maintenance window (or low-traffic period for compute node restarts)

## Step 1: Document Current Version

```bash
dpkg -l calico-compute calico-control calico-common calico-dhcp-agent calico-felix networking-calico | grep -E "^ii"
calicoctl version
etcdctl version
```

## Step 2: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > bgp-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
ETCDCTL_API=3 etcdctl snapshot save etcd-calico-snapshot.db
```

## Step 3: Upgrade Compute Nodes One at a Time

```bash
# On one compute node at a time
sudo add-apt-repository ppa:project-calico/calico-<target-minor>
sudo apt-get update
sudo apt-get install calico-compute calico-felix calico-common \
  networking-calico calico-dhcp-agent

sudo systemctl restart calico-felix
sudo systemctl status calico-felix
calico-felix --version
sudo calicoctl node status
```

Verify VMs on this compute node are still reachable before proceeding.

## Step 4: Upgrade the Controller Node

```bash
# On the controller
sudo add-apt-repository ppa:project-calico/calico-<target-minor>
sudo apt-get update
sudo apt-get install calico-control calico-common networking-calico

sudo systemctl restart neutron-server
sudo systemctl status neutron-server
```

Verify Neutron is running correctly after the upgrade.

## Step 5: Update calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v<target-release>/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
calicoctl version
```

## Step 6: Post-Upgrade Verification

```bash
calicoctl node status
calicoctl get workloadendpoints -A | wc -l
openstack server list | grep -c ACTIVE
```

The number of Calico workload endpoints should match the expected number of active OpenStack VM interfaces.

## Conclusion

Safely upgrading Calico on Ubuntu OpenStack requires upgrading Felix on compute nodes one at a time with connectivity verification after each node, then upgrading the Neutron plugin on the controller. The sequential compute node upgrade prevents a fleet-wide outage and ensures each node's VMs continue to use Calico's policy enforcement throughout the upgrade process.
