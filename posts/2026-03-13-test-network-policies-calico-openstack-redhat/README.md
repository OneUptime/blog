# How to Test Network Policies with Calico on OpenStack Red Hat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Network Policies

Description: A guide to testing Calico-enforced OpenStack Security Group policies on Red Hat Enterprise Linux-based OpenStack deployments.

---

## Introduction

Testing network policies (OpenStack Security Groups) on RHEL-based Calico deployments requires confirming that Felix's iptables rules correctly implement Security Group rules. On RHEL, the iptables backend (legacy vs nft) affects how these rules are stored and queried. Testing must account for whichever backend is configured.

RHEL's SELinux can silently block Security Group changes if Felix doesn't have the right permissions to modify iptables. A Security Group policy that appears to be applied in OpenStack but has no effect is often due to a SELinux denial blocking Felix's iptables write operations.

## Prerequisites

- Calico installed on RHEL OpenStack
- OpenStack CLI installed
- Test VMs running on compute nodes

## Step 1: Check SELinux Before Testing

```bash
sudo ausearch -m AVC -ts recent -x python3 2>/dev/null
```

If Felix has SELinux denials, fix them before policy testing.

## Step 2: Create Test VMs with Minimal Security Group

```bash
openstack security group create rhel-test-sg
openstack security group rule create --protocol icmp rhel-test-sg
openstack security group rule create --protocol tcp --dst-port 22 rhel-test-sg

openstack server create --network openstack-redhat-net \
  --security-group rhel-test-sg \
  --image rhel-minimal --flavor m1.tiny server-vm
openstack server create --network openstack-redhat-net \
  --security-group rhel-test-sg \
  --image rhel-minimal --flavor m1.tiny client-vm
```

## Step 3: Test ICMP (Allowed by Security Group)

```bash
SERVER_IP=$(openstack server show server-vm -f value -c addresses | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')
# From client-vm: ping -c3 $SERVER_IP (should succeed)
```

## Step 4: Test TCP Port Not in Security Group

```bash
# Start a web server on server-vm (port 80)
# From client-vm: curl --max-time 5 http://$SERVER_IP (should fail)
```

## Step 5: Add HTTP Rule and Re-test

```bash
openstack security group rule create --protocol tcp --dst-port 80 rhel-test-sg
# Wait a few seconds for Felix to update iptables
# From client-vm: curl --max-time 5 http://$SERVER_IP (should now succeed)
```

## Step 6: Verify iptables Rules on the Compute Node

Identify which compute node is running the server VM and check its iptables rules.

```bash
# Using iptables-legacy
sudo iptables -L | grep -E "calico|ACCEPT.*tcp.*dpt:80"

# Using iptables-nft backend
sudo nft list ruleset | grep -E "80|calico"
```

## Conclusion

Testing Security Group policies with Calico on RHEL OpenStack requires checking SELinux before testing (to ensure Felix can write iptables rules), verifying both allowed and blocked connectivity, and inspecting the iptables ruleset (with attention to the legacy vs nft backend) to confirm Felix programmed the correct rules. RHEL's SELinux enforcement is the most common source of discrepancies between expected and actual policy behavior.
