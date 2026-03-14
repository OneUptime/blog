# How to Upgrade Calico on OpenStack Ubuntu Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Upgrade

Description: A safe procedure for upgrading Calico on an Ubuntu OpenStack deployment while maintaining VM networking continuity.

---

## Introduction

Upgrading Calico in an Ubuntu OpenStack deployment requires upgrading the Calico Neutron plugin on the controller and the Felix agent on all compute nodes. The compute node upgrades are the most sensitive — restarting Felix on a compute node causes a brief interruption in policy enforcement for VMs on that node. During the restart, existing network connections are maintained (iptables rules persist), but new policy changes are not applied until Felix restarts successfully.

Upgrading compute nodes one at a time and verifying VM connectivity on each node before proceeding to the next is the safest approach.

## Prerequisites

- Calico installed on an Ubuntu OpenStack cluster
- Root access to controller and compute nodes
- A maintenance window (or low-traffic period for compute node restarts)

## Step 1: Document Current Version

```bash
dpkg -l calico-felix networking-calico | grep -E "^ii"
calicoctl version
etcdctl version
```

## Step 2: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > bgp-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
etcdctl ls /calico --recursive > etcd-calico-keys-backup.txt
```

## Step 3: Upgrade the Controller Node

```bash
# On the controller
sudo apt-get update
sudo apt-get install --only-upgrade python3-networking-calico

sudo systemctl restart neutron-server
sudo systemctl status neutron-server
```

Verify Neutron is running correctly after the upgrade.

## Step 4: Upgrade Compute Nodes One at a Time

```bash
# On one compute node at a time
sudo apt-get update
sudo apt-get install --only-upgrade calico-compute calico-felix

sudo systemctl restart calico-felix
sudo systemctl status calico-felix
sudo calicoctl node status
```

Verify VMs on this compute node are still reachable before proceeding.

## Step 5: Update calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
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

The number of Calico workload endpoints should match the number of active OpenStack instances.

## Conclusion

Safely upgrading Calico on Ubuntu OpenStack requires upgrading the Neutron plugin on the controller first, then upgrading Felix on compute nodes one at a time with connectivity verification after each node. The sequential compute node upgrade prevents a fleet-wide outage and ensures each node's VMs continue to be protected by Calico's policy enforcement throughout the upgrade process.
