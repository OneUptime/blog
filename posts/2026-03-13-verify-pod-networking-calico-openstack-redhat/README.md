# How to Verify Pod Networking with Calico on OpenStack Red Hat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Verification

Description: A guide to verifying Calico networking for virtual machines on Red Hat-based OpenStack, including RHEL-specific diagnostic checks.

---

## Introduction

Verifying Calico networking on RHEL-based OpenStack follows the same logical workflow as Ubuntu — check Felix health, verify workload endpoints, test VM connectivity — but adds RHEL-specific checks: SELinux audit logs for policy denials, firewalld rules for BGP traffic, and iptables-nft vs iptables-legacy compatibility confirmation.

RHEL's SELinux is the most common source of silent failures in Calico deployments — Felix may appear to be running but unable to manage iptables rules if SELinux denials are blocking it. Checking the SELinux audit log is an essential verification step on RHEL.

## Prerequisites

- Calico installed on RHEL OpenStack
- Root access to controller and compute nodes
- OpenStack CLI installed

## Step 1: Check Felix Service Status

```bash
# On each compute node
sudo systemctl status calico-felix
sudo calicoctl node status
```

## Step 2: Check SELinux Denials

```bash
# Check for recent SELinux denials related to Calico
sudo ausearch -m AVC -ts recent | grep -iE "felix|calico|iptables"
```

If denials are found, the iptables rules may not be programmed correctly. Add the required SELinux permissions:

```bash
sudo audit2allow -M calico-felix < /var/log/audit/audit.log
sudo semodule -i calico-felix.pp
```

## Step 3: Verify iptables Rules Are Present

```bash
sudo iptables -L | grep -c "calico"
# Should return > 0
```

If iptables is managed by nft backend:

```bash
sudo nft list tables | grep calico
```

## Step 4: Verify Workload Endpoints

```bash
calicoctl get workloadendpoints -A
openstack server list | grep ACTIVE
```

Each active VM should have a Calico workload endpoint.

## Step 5: Test VM-to-VM Connectivity

```bash
# Create two test VMs
openstack server create --network openstack-redhat-net \
  --image rhel-minimal --flavor m1.tiny vm-a
openstack server create --network openstack-redhat-net \
  --image rhel-minimal --flavor m1.tiny vm-b

VM_B_IP=$(openstack server show vm-b -f value -c addresses | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')
# From vm-a console: ping -c3 $VM_B_IP
```

## Step 6: Verify BGP Routes

```bash
sudo calicoctl node status
ip route show | grep "proto bird"
```

## Conclusion

Verifying Calico on RHEL-based OpenStack adds SELinux denial checking and iptables backend verification to the standard workflow. SELinux denials are the most common source of silent policy enforcement failures on RHEL and must be checked explicitly, as Felix may run without errors while SELinux prevents it from managing iptables rules.
