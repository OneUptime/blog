# How to Configure iSCSI Multipath for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, Multipath, High Availability

Description: Learn how to configure iSCSI multipath (MPIO) for Ceph gateways on Linux clients to achieve redundant paths and improved throughput.

---

## Why Multipath for Ceph iSCSI?

A single iSCSI connection creates a single point of failure. If the gateway node fails or the network path is disrupted, the storage becomes unavailable. Multipath I/O (MPIO) connects the initiator to multiple gateway portals simultaneously, providing both failover redundancy and the option for load balancing.

## Installing Multipath Tools on Linux

Install device-mapper-multipath on the initiator:

```bash
# RHEL/CentOS
dnf install -y device-mapper-multipath

# Ubuntu/Debian
apt-get install -y multipath-tools
```

Enable and start the service:

```bash
systemctl enable --now multipathd
```

## Configuring multipath.conf

Create or edit `/etc/multipath.conf` with settings appropriate for Ceph iSCSI:

```bash
cat > /etc/multipath.conf << 'EOF'
defaults {
    user_friendly_names yes
    find_multipaths yes
    polling_interval 10
    path_selector "round-robin 0"
    failback immediate
    no_path_retry fail
}

blacklist {
    devnode "^sda"
}

devices {
    device {
        vendor "LIO-ORG"
        product ".*"
        path_grouping_policy failover
        path_checker tur
        hardware_handler "1 alua"
        prio alua
        failback immediate
    }
}
EOF
```

Reload the multipath configuration:

```bash
multipath -r
systemctl restart multipathd
```

## Configuring Multiple iSCSI Sessions

Discover the targets on each gateway portal:

```bash
iscsiadm -m discovery -t sendtargets -p 10.0.1.10:3260
iscsiadm -m discovery -t sendtargets -p 10.0.1.11:3260
```

Connect to the same target through both gateway portals to create two sessions:

```bash
# Connect through gateway 1
iscsiadm -m node -T iqn.2024-01.com.example:storage \
  -p 10.0.1.10:3260 --login

# Connect through gateway 2
iscsiadm -m node -T iqn.2024-01.com.example:storage \
  -p 10.0.1.11:3260 --login
```

Verify both sessions are active:

```bash
iscsiadm -m session
```

Expected output:

```text
tcp: [1] 10.0.1.10:3260,1 iqn.2024-01.com.example:storage
tcp: [2] 10.0.1.11:3260,1 iqn.2024-01.com.example:storage
```

## Verifying Multipath Device

Check that multipath recognized both paths:

```bash
multipath -ll
```

Expected output:

```text
mpatha (360014051d23f9c1 ...) dm-2 LIO-ORG,TCMU device
size=100G features='0' hwhandler='1 alua' wp=rw
|-+- policy='round-robin 0' prio=50 status=active
| `- 3:0:0:0 sdb 8:16 active ready running
`-+- policy='round-robin 0' prio=10 status=enabled
  `- 4:0:0:0 sdc 8:32 active ready running
```

## Configuring Round-Robin Load Balancing

For active-active load balancing, use the `round-robin` path selector:

```bash
cat >> /etc/multipath.conf << 'EOF'
multipaths {
    multipath {
        wwid 360014051d23f9c1
        alias ceph-iscsi-vol1
        path_grouping_policy multibus
        path_selector "round-robin 0"
    }
}
EOF
multipath -r
```

## Making Connections Persistent

Ensure iSCSI sessions reconnect after reboot:

```bash
iscsiadm -m node -T iqn.2024-01.com.example:storage \
  -p 10.0.1.10:3260 --op update -n node.startup -v automatic
iscsiadm -m node -T iqn.2024-01.com.example:storage \
  -p 10.0.1.11:3260 --op update -n node.startup -v automatic
```

## Summary

Configuring iSCSI multipath for Ceph involves installing multipath tools, creating a tuned `multipath.conf` for LIO targets, establishing separate iSCSI sessions through each gateway, and verifying that device-mapper-multipath aggregates both paths. This setup provides transparent failover and optional load balancing, eliminating the single-path availability risk.
