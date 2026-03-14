# How to Test Network Policies with Calico on OpenStack Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Ubuntu, Networking, Network Policies, Security Groups

Description: A guide to testing Calico network policy enforcement for OpenStack virtual machines on Ubuntu.

---

## Introduction

In OpenStack, network policy for virtual machines is typically managed through Security Groups, which are implemented as iptables rules by the compute agent. With Calico as the Neutron backend, Security Groups are implemented by Felix rather than the standard Neutron agent. This provides consistent policy enforcement across both VM and Kubernetes workloads in deployments that use Calico for both.

Testing Calico's enforcement of OpenStack Security Group policies is similar to testing Kubernetes NetworkPolicy — you deploy test VMs, configure Security Groups, and verify that allowed and denied connections behave correctly. The additional layer is verifying that Felix has correctly translated the Security Group rules into its iptables or eBPF rules.

## Prerequisites

- Calico installed as the Neutron backend on Ubuntu OpenStack
- OpenStack CLI installed
- At least two running test VMs

## Step 1: Create Test VMs and Security Groups

```bash
# Create a security group that allows only SSH
openstack security group create calico-test-sg
openstack security group rule create --protocol tcp --dst-port 22 calico-test-sg
openstack security group rule create --protocol icmp calico-test-sg

# Create test VMs
openstack server create --network test-calico-net \
  --security-group calico-test-sg \
  --image cirros --flavor m1.tiny server-vm
openstack server create --network test-calico-net \
  --security-group calico-test-sg \
  --image cirros --flavor m1.tiny client-vm
```

## Step 2: Verify Security Group Allows ICMP and SSH

```bash
SERVER_IP=$(openstack server show server-vm -f value -c addresses | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')
# From client-vm
ping -c3 $SERVER_IP     # Should succeed
ssh cirros@$SERVER_IP   # Should succeed
```

## Step 3: Add HTTP Rule and Test

```bash
openstack security group rule create --protocol tcp --dst-port 80 calico-test-sg
# Start a simple HTTP server on server-vm
# Test HTTP from client-vm
curl -s --max-time 5 http://$SERVER_IP
```

## Step 4: Remove HTTP Rule and Verify Block

```bash
HTTP_RULE_ID=$(openstack security group rule list calico-test-sg -f value | grep " 80 " | awk '{print $1}')
openstack security group rule delete $HTTP_RULE_ID
# HTTP should now be blocked
curl -s --max-time 5 http://$SERVER_IP || echo "Blocked by Calico Security Group enforcement"
```

## Step 5: Verify Felix Has Programmed the Rules

On the compute node hosting the server VM:

```bash
# Find the interface for the VM
ip link show | grep tap

# Check iptables rules for the interface
iptables -L | grep calico
```

## Step 6: Check Calico Workload Endpoint Policy

```bash
calicoctl get workloadendpoint -A -o yaml | grep -A10 "policy"
```

## Conclusion

Testing Calico's enforcement of OpenStack Security Group policies on Ubuntu verifies that Felix correctly translates Security Group rules into iptables rules that control VM-level traffic. The testing workflow — adding and removing Security Group rules and verifying connectivity changes — confirms that the Neutron-to-Calico policy translation is working correctly in real time.
