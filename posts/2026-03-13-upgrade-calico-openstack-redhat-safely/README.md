# How to Upgrade Calico on OpenStack Red Hat Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Upgrade

Description: A safe procedure for upgrading Calico on Red Hat-based OpenStack while maintaining VM networking.

---

## Introduction

Upgrading Calico on RHEL OpenStack uses RPM-based package management (`dnf`) rather than Debian's `apt`. The upgrade procedure is otherwise similar to other RPM-based OpenStack deployments: update Calico packages on compute nodes one at a time with connectivity verification after each, then update the Calico Neutron plugin on the controller. RHEL-specific considerations include checking SELinux policy compatibility after the upgrade and verifying that the iptables backend configuration is preserved.

Project Calico's RHEL OpenStack installation path is not actively tested in current documentation, so validate the procedure against your deployed Calico and OpenStack versions before the maintenance window.

New Calico versions sometimes introduce changes to the iptables rules structure that can conflict with existing SELinux policies. Having an SELinux check as part of the post-upgrade verification prevents silent policy enforcement failures after the upgrade.

## Prerequisites

- Calico installed on RHEL OpenStack
- Root access to all nodes
- A maintenance window

## Step 1: Document Current State

```bash
sudo rpm -qa | grep -iE "calico|networking-calico|etcd"
sudo calicoctl version
sudo calicoctl node status
```

## Step 2: Backup Configuration

```bash
sudo cp /etc/calico/felix.cfg /etc/calico/felix.cfg.bak
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
```

## Step 3: Upgrade Compute Nodes One at a Time

```bash
# On each compute node

sudo dnf update calico-common calico-compute calico-dhcp-agent calico-felix dnsmasq networking-calico openstack-neutron openstack-nova-api openstack-nova-compute
sudo systemctl restart calico-felix
sudo systemctl status calico-felix

# Confirm Felix upgraded
calico-felix --version

# Confirm the datastore type is still etcdv3
grep -i "^DatastoreType" /etc/calico/felix.cfg

# Check SELinux after upgrade
sudo ausearch -m AVC -ts recent | grep -iE "felix|calico" | head -10
```

If new SELinux denials appear:

```bash
sudo ausearch -m AVC -ts recent | audit2allow -M calico-upgraded
sudo semodule -i calico-upgraded.pp
```

Verify VM connectivity on the upgraded compute node before proceeding.

## Step 4: Upgrade on the Controller

```bash
sudo dnf update calico-common calico-control networking-calico openstack-neutron
sudo systemctl restart neutron-server
sudo systemctl status neutron-server
```

## Step 5: Verify BGP Sessions

```bash
sudo calicoctl node status
```

All BGP sessions should be `Established` on every compute node.

## Step 6: Final Verification

```bash
calicoctl version
calicoctl get workloadendpoints -A | wc -l
openstack server list | grep -c ACTIVE
```

The workload endpoint count should match the expected number of VM interfaces, which can be higher than the active VM count when instances have multiple ports.

## Conclusion

Upgrading Calico on RHEL OpenStack adds an SELinux policy check to the standard upgrade workflow. New Calico versions may require updated SELinux permissions for iptables operations, and catching these denials immediately after each compute node upgrade prevents silent policy enforcement failures from going undetected in production.
