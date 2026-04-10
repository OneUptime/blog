# How to Configure Arbiter Monitors for Stretch Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Mode, Monitor, High Availability

Description: Learn how to configure arbiter monitors for Ceph stretch mode, including placement, location labeling, and quorum verification steps.

---

## Role of the Arbiter Monitor

In Ceph stretch mode, the arbiter monitor is a lightweight monitor that does not host OSDs. Its sole purpose is to provide the deciding vote when the two main sites cannot communicate with each other. Without the arbiter, a network partition between sites would leave both sides unable to establish quorum.

The arbiter should be placed in a third location (a different network segment, cloud region, or co-lo) that is independently reachable from both sites.

## Hardware Requirements

The arbiter monitor has minimal resource requirements since it only participates in election quorum:

- 2 vCPUs
- 4 GB RAM
- 20 GB SSD (for monitor store)
- Low-latency network connectivity to both sites

## Adding the Arbiter Monitor

First, install cephadm or ceph-common on the arbiter host, then add the host to the cluster:

```bash
ceph orch host add arbiter-host 10.0.3.10
```

Deploy a monitor on the arbiter host:

```bash
ceph orch daemon add mon arbiter-host:10.0.3.10
```

Alternatively, use a placement spec file:

```yaml
service_type: mon
placement:
  hosts:
    - mon-dc1a
    - mon-dc1b
    - mon-dc2a
    - mon-dc2b
    - mon-arbiter
```

```bash
ceph orch apply -i mon-placement.yaml
```

## Setting the Monitor Location

The arbiter monitor must be assigned a CRUSH location label that is distinct from both site labels:

```bash
ceph mon set_location mon-arbiter datacenter=arbiter
```

Verify the location is set:

```bash
ceph mon dump | grep arbiter
```

Expected output:

```text
mon.mon-arbiter
  addr: 10.0.3.10:6789/0
  crush_location: datacenter=arbiter
```

## Enabling the Arbiter in Stretch Mode

When enabling stretch mode, reference the arbiter monitor name explicitly:

```bash
ceph mon enable_stretch_mode mon-arbiter stretch_rule datacenter
```

This tells the Ceph election algorithm that `mon-arbiter` is the tiebreaker and should not be used for data placement.

## Checking Arbiter Status

Verify the arbiter is in quorum and recognized as the tiebreaker:

```bash
ceph mon dump --format json-pretty
```

Look for `"tiebreaker_mon": "mon-arbiter"` and `"stretch_mode": true` in the output.

Check that the arbiter is in quorum:

```bash
ceph mon stat
```

## Replacing a Failed Arbiter

If the arbiter monitor fails, the cluster continues to operate normally as long as both data sites remain healthy. Replace the arbiter by removing the old monitor and adding a new one:

```bash
ceph orch daemon rm mon.mon-arbiter
ceph orch host rm arbiter-host
ceph orch host add new-arbiter-host 10.0.3.20
ceph orch apply mon --placement="mon-dc1a,mon-dc1b,mon-dc2a,mon-dc2b,mon-new-arbiter"
ceph mon set_location mon-new-arbiter datacenter=arbiter
```

## Summary

The arbiter monitor is a critical but lightweight component of Ceph stretch mode that provides quorum tiebreaking during site-level failures. Proper CRUSH location labeling and explicit designation during stretch mode activation ensure the arbiter functions correctly. Because the arbiter hosts no data, replacing it is straightforward and does not risk data loss.
