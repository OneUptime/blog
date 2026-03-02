# How to Configure Fencing (STONITH) in Pacemaker on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, High Availability, Pacemaker, Clustering, STONITH

Description: Learn how to configure STONITH fencing in Pacemaker on Ubuntu to protect cluster integrity and prevent split-brain scenarios in high availability setups.

---

Fencing is the mechanism that allows a cluster to forcibly remove a node that is behaving unexpectedly. Without fencing, a misbehaving node might continue to access shared resources even after the cluster has decided it should not, potentially causing data corruption. STONITH - Shoot The Other Node In The Head - is Pacemaker's term for this fencing capability.

Understanding why fencing matters is the first step. When a node loses communication with the rest of the cluster, the surviving nodes cannot tell whether the silent node has crashed or just lost network connectivity. If they assume it crashed and start the resources it was running, and the node is actually still running those resources, both nodes could be writing to shared storage simultaneously. Fencing solves this by giving the cluster a reliable way to ensure the problematic node has truly stopped.

## Prerequisites

Before configuring STONITH, make sure you have a working Pacemaker/Corosync cluster. Both nodes should be visible to each other and the cluster software should be installed:

```bash
# Install cluster stack on both nodes
sudo apt update
sudo apt install -y pacemaker corosync pcs

# Set password for hacluster user (run on both nodes)
sudo passwd hacluster

# Start and enable pcsd
sudo systemctl enable --now pcsd
```

## Understanding STONITH Agents

Pacemaker uses fence agents - programs that implement the actual fencing action. Common fence agents include:

- `fence_ipmilan` - fences via IPMI (most common in physical servers)
- `fence_aws` - fences via AWS EC2 API
- `fence_azure_arm` - fences via Azure Resource Manager
- `fence_virsh` - fences KVM virtual machines via libvirt
- `fence_sbd` - uses SCSI-based disk fencing

Install the fence agents package:

```bash
# Install fence agents
sudo apt install -y fence-agents

# List available fence agents
ls /usr/sbin/fence_*
```

## Configuring IPMI-Based Fencing

For physical servers with IPMI/BMC interfaces, `fence_ipmilan` is the standard choice:

```bash
# Test the fence agent before adding it to the cluster
# Replace with your actual BMC IP and credentials
fence_ipmilan \
  -a 192.168.1.101 \
  -l admin \
  -p secretpassword \
  -o status

# The output should show power status of the remote node
```

Add the STONITH resource to the cluster. Run this from one node only:

```bash
# Authenticate nodes (run once)
sudo pcs host auth node1 node2 -u hacluster -p yourpassword

# Create STONITH resource for node1's fence agent pointing at node2's BMC
sudo pcs stonith create fence-node2 fence_ipmilan \
  pcmk_host_list="node2" \
  ipaddr="192.168.1.102" \
  login="admin" \
  passwd="secretpassword" \
  lanplus=1 \
  op monitor interval=60s

# Create STONITH resource for node2's fence agent pointing at node1's BMC
sudo pcs stonith create fence-node1 fence_ipmilan \
  pcmk_host_list="node1" \
  ipaddr="192.168.1.101" \
  login="admin" \
  passwd="secretpassword" \
  lanplus=1 \
  op monitor interval=60s
```

## Configuring SBD Fencing for Virtual Environments

In virtualized or cloud environments without IPMI, SBD (SCSI-Based Death) fencing uses a shared disk as a watchdog mechanism:

```bash
# Install SBD
sudo apt install -y sbd

# Initialize SBD on a shared disk (run on one node)
# /dev/sdc should be a shared disk accessible by both nodes
sudo sbd -d /dev/sdc create

# Configure SBD in /etc/default/sbd
sudo tee /etc/default/sbd << 'EOF'
SBD_DEVICE="/dev/sdc"
SBD_PACEMAKER=yes
SBD_STARTMODE=always
SBD_DELAY_START=no
SBD_WATCHDOG_DEV=/dev/watchdog
SBD_WATCHDOG_TIMEOUT=5
EOF

# Enable SBD service
sudo systemctl enable sbd

# Add SBD STONITH to Pacemaker
sudo pcs stonith create sbd-fencing fence_sbd \
  devices="/dev/sdc" \
  pcmk_reboot_action="off"
```

## Configuring virsh Fencing for KVM Guests

When your cluster nodes are KVM virtual machines managed by a hypervisor:

```bash
# Install fence-agents-virsh
sudo apt install -y fence-agents-virsh

# Test connectivity to hypervisor
fence_virsh \
  -a 192.168.1.1 \
  -l root \
  -k /root/.ssh/id_rsa \
  -p node2 \
  -o status

# Create the STONITH resource
sudo pcs stonith create fence-node2-virsh fence_virsh \
  pcmk_host_list="node2" \
  ip="192.168.1.1" \
  login="root" \
  identity_file="/root/.ssh/id_rsa" \
  plug="node2" \
  op monitor interval=60s
```

## Enabling and Verifying STONITH

Once configured, enable STONITH in the cluster:

```bash
# Enable STONITH (it may be disabled by default or for testing)
sudo pcs property set stonith-enabled=true

# Verify STONITH is enabled
sudo pcs property show stonith-enabled

# View the current STONITH configuration
sudo pcs stonith show

# Check cluster status including STONITH resources
sudo pcs status
```

## Testing Fencing

Before relying on fencing in production, test that it works:

```bash
# Test by fencing a node manually (this will reboot/power-off node2)
# WARNING: This actually fences the node
sudo pcs stonith fence node2

# Check status after fencing
sudo pcs status

# Bring node2 back online after testing
# On node2, once it boots:
sudo pcs node unstandby node2
```

## Setting the Stonith Action

The default fencing action is reboot. You can change it to power-off for certain scenarios:

```bash
# Set global fencing action
sudo pcs property set stonith-action=reboot

# Or configure per-resource
sudo pcs stonith update fence-node2 action=reboot
```

## Location Constraints for STONITH

A node should not fence itself. Add location constraints to prevent a node from managing its own fence agent:

```bash
# fence-node1 should not run on node1 (it fences node1)
sudo pcs constraint location fence-node1 avoids node1

# fence-node2 should not run on node2 (it fences node2)
sudo pcs constraint location fence-node2 avoids node2
```

## Troubleshooting Fencing Issues

When fencing fails, check these common causes:

```bash
# Check STONITH resource logs
sudo journalctl -u pacemaker --since "1 hour ago" | grep -i stonith

# Test fence agent manually with verbose output
fence_ipmilan \
  -a 192.168.1.102 \
  -l admin \
  -p secretpassword \
  -o status \
  -v

# Check if IPMI is reachable
ipmitool -I lanplus -H 192.168.1.102 -U admin -P secretpassword power status

# View pacemaker logs for fencing events
sudo grep -i "fenc" /var/log/pacemaker/pacemaker.log | tail -50
```

If a node is showing as UNCLEAN in cluster status, it means fencing is required before the cluster will allow resources to migrate:

```bash
# Check for unclean nodes
sudo pcs status | grep -i unclean

# If fencing is not possible (testing environment), you can manually confirm
# a node is down (USE ONLY WHEN YOU ARE SURE THE NODE IS OFF)
sudo pcs stonith confirm node2
```

## Fencing Timeouts and Delays

Tuning fencing timeouts can improve reliability:

```bash
# Set stonith timeout (how long to wait for fencing to complete)
sudo pcs property set stonith-timeout=120s

# Set stonith-watchdog-timeout for SBD environments
sudo pcs property set stonith-watchdog-timeout=30s

# Update fence resource timeout
sudo pcs stonith update fence-node2 \
  op monitor interval=60s timeout=60s \
  op start timeout=120s \
  op stop timeout=60s
```

Proper STONITH configuration is not optional in production clusters - it is the mechanism that allows Pacemaker to act decisively when a node becomes unreachable. Take the time to configure it correctly, test it thoroughly in a non-production environment, and document your fencing topology so the team understands how the cluster protects itself during failures.
