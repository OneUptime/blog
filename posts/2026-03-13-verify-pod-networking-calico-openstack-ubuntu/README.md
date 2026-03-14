# How to Verify Pod Networking with Calico on OpenStack Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Verification

Description: A guide to verifying that Calico is correctly providing networking for virtual machines in an Ubuntu-based OpenStack deployment.

---

## Introduction

In an OpenStack context, "pod networking" refers to the networking provided to virtual machine instances (VMs) through Neutron. Verifying Calico's network provision for OpenStack VMs requires checking both the OpenStack layer (Neutron ports, IP allocation) and the Calico layer (workload endpoints, Felix state, BGP route advertisement).

A VM that receives a Calico-managed IP should be reachable from other VMs, from the physical network (if BGP routes are being advertised), and should be able to reach external destinations through NAT or direct routing. Each of these paths requires a specific verification step.

## Prerequisites

- Calico installed as the Neutron backend on Ubuntu OpenStack
- `calicoctl` and OpenStack CLI installed
- At least one running VM for testing

## Step 1: Verify Felix Is Running on Compute Nodes

```bash
# On each compute node
sudo systemctl status calico-felix
sudo calicoctl node status
```

## Step 2: Check Calico Workload Endpoints

```bash
calicoctl get workloadendpoints -A
```

Each running OpenStack VM should have a corresponding workload endpoint.

## Step 3: Verify VM Received a Calico-Managed IP

```bash
openstack server show test-vm | grep addresses
openstack port show <port-id> | grep fixed_ips
```

The IP should fall within your configured Calico IP pool.

## Step 4: Test VM-to-VM Connectivity

Launch two test VMs and test connectivity.

```bash
openstack server create --network test-calico-net \
  --image cirros --flavor m1.tiny vm-a
openstack server create --network test-calico-net \
  --image cirros --flavor m1.tiny vm-b

VM_B_IP=$(openstack server show vm-b -f value -c addresses | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')
# SSH into vm-a and ping vm-b
ssh cirros@$(openstack server show vm-a -f value -c addresses | ...) ping -c3 $VM_B_IP
```

## Step 5: Verify BGP Route Advertisement

On the compute node:

```bash
sudo calicoctl node status | grep -A5 "BGP"
ip route show | grep "proto bird"
```

VM IPs should appear as BGP-advertised routes.

## Step 6: Test External Connectivity from VMs

```bash
# From a VM console
ping -c3 8.8.8.8
curl -s http://example.com | head -5
```

## Step 7: Check Calico and Neutron Consistency

Verify Neutron ports and Calico endpoints are in sync.

```bash
openstack port list | wc -l
calicoctl get workloadendpoints -A | wc -l
```

The counts should match (one Calico endpoint per Neutron port).

## Conclusion

Verifying Calico networking for OpenStack VMs on Ubuntu requires checking Felix service health on compute nodes, confirming workload endpoint creation for each VM, testing inter-VM connectivity, verifying BGP route advertisement, and validating external connectivity. The consistency check between Neutron port counts and Calico workload endpoint counts is a quick sanity check that catches synchronization issues between the two systems.
