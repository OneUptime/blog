# How to Verify Pod Networking with Calico on OpenStack DevStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Verification, Development

Description: A guide to verifying Calico networking in a DevStack development environment.

---

## Introduction

Verifying Calico networking in a DevStack environment is the first step in validating Calico-OpenStack integration changes before promoting them to production. DevStack's single-node architecture means all networking is local, but the Calico components (Felix, etcd, BIRD) operate the same way as in a multi-node production cluster. Verification in DevStack confirms your configuration and code changes work correctly at the component level.

The main limitation of DevStack verification is that it cannot test multi-node BGP peering or cross-compute-node VM connectivity. These scenarios require a multi-node DevStack or a staging environment.

## Prerequisites

- DevStack with Calico installed and running
- `calicoctl` available (installed by DevStack Calico plugin)

## Step 1: Check DevStack Services Status

```bash
# DevStack runs services with screen; check their status
sudo systemctl status devstack@calico-felix
sudo systemctl status devstack@calico-etcd
sudo systemctl status devstack@calico-bird
```

Or check the screen session:

```bash
screen -ls
screen -r stack  # Attach to the DevStack screen session
```

## Step 2: Verify Calico Components Are Running

```bash
calicoctl node status
calicoctl get felixconfiguration default -o yaml | head -10
calicoctl get ippool -o wide
```

## Step 3: Create a Test Network and VM

```bash
source /opt/stack/devstack/openrc admin admin
openstack network create verify-net
openstack subnet create --network verify-net \
  --subnet-range 10.65.0.0/24 verify-subnet
openstack server create --network verify-net \
  --image cirros --flavor cirros256 verify-vm
openstack server list
```

## Step 4: Verify Workload Endpoint Is Created

```bash
openstack server show verify-vm | grep addresses
calicoctl get workloadendpoints -A
```

The VM should have a corresponding Calico workload endpoint.

## Step 5: Test VM Connectivity

Access the VM console and test connectivity:

```bash
openstack console log verify-vm
# Or use VNC console
openstack console url show verify-vm
```

From the VM console:

```bash
ping -c3 8.8.8.8  # External connectivity
```

## Step 6: Test Security Group Enforcement

```bash
# Create a restrictive security group
openstack security group create verify-sg
openstack security group rule create --protocol icmp verify-sg

# Assign to VM and test that TCP is blocked
```

## Conclusion

Verifying Calico in DevStack confirms the core networking components (Felix, etcd, BIRD) are working, that VMs receive IPs and create workload endpoints, and that security group policies are enforced. DevStack verification is a fast iteration loop for development — changes to the networking-calico code can be tested in minutes with a DevStack re-run.
