# How to Configure STONITH Fencing in a Pacemaker Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, STONITH, Fencing, Pacemaker, High Availability, Cluster, Linux

Description: Learn how to configure STONITH fencing in a Pacemaker cluster on RHEL to prevent data corruption during split-brain scenarios.

---

STONITH (Shoot The Other Node In The Head) is the fencing mechanism in Pacemaker that ensures a failed node is truly offline before resources are moved. Without fencing, a split-brain scenario can cause data corruption when both nodes access shared resources simultaneously.

## Prerequisites

- A RHEL Pacemaker cluster set up with pcs
- Fencing hardware (IPMI, iLO, DRAC, or virtual fencing for VMs)
- Root or sudo access

## Why Fencing is Required

When Pacemaker detects a node failure, it needs to guarantee that the failed node is not still accessing shared resources. STONITH achieves this by:

- Power cycling the failed node
- Disabling network access
- Shutting down the failed node's storage access

## Listing Available Fence Agents

View all installed fence agents:

```bash
pcs stonith list
```

Common agents:

- `fence_ipmilan` - IPMI/iLO/DRAC
- `fence_vmware_soap` - VMware vSphere
- `fence_xvm` - KVM/libvirt
- `fence_rhevm` - Red Hat Virtualization
- `fence_aws` - Amazon AWS
- `fence_azure_arm` - Microsoft Azure
- `fence_gce` - Google Cloud

## Viewing Fence Agent Parameters

Check required parameters for a specific agent:

```bash
pcs stonith describe fence_ipmilan
```

## Configuring IPMI Fencing

For physical servers with IPMI (most common):

```bash
sudo pcs stonith create fence-node1 fence_ipmilan \
    ipaddr=10.0.0.101 \
    login=admin \
    passwd=secretpassword \
    lanplus=1 \
    power_wait=4 \
    pcmk_host_list=node1 \
    op monitor interval=60s

sudo pcs stonith create fence-node2 fence_ipmilan \
    ipaddr=10.0.0.102 \
    login=admin \
    passwd=secretpassword \
    lanplus=1 \
    power_wait=4 \
    pcmk_host_list=node2 \
    op monitor interval=60s
```

## Configuring KVM/libvirt Fencing

For KVM virtual machines:

```bash
sudo pcs stonith create fence-node1 fence_xvm \
    port=node1 \
    pcmk_host_list=node1 \
    op monitor interval=60s

sudo pcs stonith create fence-node2 fence_xvm \
    port=node2 \
    pcmk_host_list=node2 \
    op monitor interval=60s
```

## Configuring VMware Fencing

For VMware virtual machines:

```bash
sudo pcs stonith create fence-node1 fence_vmware_soap \
    ipaddr=vcenter.example.com \
    login=admin@vsphere.local \
    passwd=password \
    ssl=1 ssl_insecure=1 \
    port=node1 \
    pcmk_host_list=node1 \
    op monitor interval=60s
```

## Setting Location Constraints

Ensure fence devices run on the opposite node:

```bash
sudo pcs constraint location fence-node1 avoids node1
sudo pcs constraint location fence-node2 avoids node2
```

## Enabling STONITH

Enable fencing in the cluster:

```bash
sudo pcs property set stonith-enabled=true
```

## Testing Fencing

Test a fence device without actually fencing:

```bash
sudo pcs stonith fence node2 --off
```

Verify the node is fenced:

```bash
sudo pcs status
```

Test that fencing works properly by simulating a failure:

```bash
# On node2, crash the kernel (for testing only)
echo c | sudo tee /proc/sysrq-trigger
```

The cluster should detect the failure and fence node2.

## Configuring Fencing Topology

For redundant fencing, configure multiple fence devices per node:

```bash
sudo pcs stonith create fence-node1-ipmi fence_ipmilan \
    ipaddr=10.0.0.101 login=admin passwd=pass lanplus=1 \
    pcmk_host_list=node1

sudo pcs stonith create fence-node1-pdu fence_apc \
    ipaddr=10.0.0.200 login=admin passwd=pass \
    port=1 pcmk_host_list=node1

sudo pcs stonith level add 1 node1 fence-node1-ipmi
sudo pcs stonith level add 2 node1 fence-node1-pdu
```

This tries IPMI first, then PDU power cycling if IPMI fails.

## Verifying Fencing Configuration

```bash
sudo pcs stonith status
sudo pcs stonith config
sudo pcs property show stonith-enabled
```

## Conclusion

STONITH fencing is not optional in production Pacemaker clusters on RHEL. Configure the appropriate fence agent for your environment, test it thoroughly, and set up redundant fencing for critical systems. Without proper fencing, your cluster risks data corruption during failures.
