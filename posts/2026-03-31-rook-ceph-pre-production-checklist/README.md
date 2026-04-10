# How to Create a Ceph Pre-Production Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Checklist, Production, Deployment

Description: Build a Ceph pre-production checklist covering hardware requirements, network validation, CRUSH topology, pool settings, monitoring, and backup procedures.

---

A pre-production checklist ensures nothing critical is overlooked before a Ceph cluster starts serving production workloads. This guide provides a comprehensive checklist you can adapt for your environment.

## Hardware and OS

```json
[ ] Minimum 3 MON nodes on separate physical hosts
[ ] Minimum 3 OSD nodes with dedicated OSD disks (no OS co-location)
[ ] NTP synchronized across all nodes (max 50 ms skew)
[ ] OS and kernel versions tested and supported for your Ceph version
[ ] All disks are new or thoroughly tested (no pre-existing SMART errors)
[ ] Sufficient RAM: at least 5 GB per OSD daemon (osd_memory_target defaults to 4 GB), 32 GB per MON
```

Verify NTP:

```bash
chronyc tracking | grep "System time"
timedatectl show | grep "NTPSynchronized"
```

## Network

```json
[ ] Dedicated cluster network separate from public network
[ ] Network bandwidth: at least 10 Gbps for production
[ ] MTU set consistently (9000 for jumbo frames if applicable)
[ ] Firewall rules allowing Ceph ports 3300, 6789, 6800-7300
[ ] No packet loss between all OSD pairs
```

```bash
# Verify MTU
ip link show | grep mtu
# Verify no packet loss
ping -c 1000 -i 0.01 osd-host-2 | tail -2
```

## CRUSH Map

```json
[ ] Failure domain set to "host" (minimum) or "rack"
[ ] At least 3 failure domains for replica-3 pools
[ ] OSD weights reflect actual disk capacity
[ ] No single point of failure in CRUSH hierarchy
```

```bash
ceph osd crush tree
ceph osd crush rule dump
```

## Pool Configuration

```json
[ ] Default pools removed or renamed if not needed
[ ] Replication size = 3 for all production pools
[ ] min_size = 2 to prevent writes with only 1 replica
[ ] PG autoscaler enabled (default since Nautilus), or PG count set manually: (OSDs * 100) / replica_count
[ ] Quotas set on pools where applicable
```

```bash
ceph osd pool ls detail
ceph osd pool get rbd all
```

## Security

```json
[ ] CephX authentication enabled
[ ] Client keyrings scoped to minimum required capabilities
[ ] Dashboard password changed from default
[ ] TLS enabled on RGW endpoints if exposed externally
```

## Monitoring and Alerting

```json
[ ] Prometheus metrics endpoint enabled and scraped
[ ] Grafana dashboards deployed and showing data
[ ] Alert rules configured for HEALTH_ERR, OSD down, near-full
[ ] Runbook links included in alert annotations
```

## Backup and Recovery

```json
[ ] MON keyring backed up to secure offline location
[ ] CRUSH map exported and stored in version control
[ ] Pool configuration documented
[ ] RBD snapshot schedule configured for critical volumes
[ ] Recovery procedures documented and tested
```

```bash
# Export CRUSH map
ceph osd getcrushmap -o crushmap.bin
crushtool -d crushmap.bin -o crushmap.txt
```

## Final Sign-Off

```json
[ ] ceph health: HEALTH_OK
[ ] All PGs: active+clean
[ ] Baseline performance recorded
[ ] Runbooks written and reviewed
[ ] On-call rotation established
```

## Summary

A Ceph pre-production checklist covers hardware, networking, CRUSH topology, pool settings, security, monitoring, and backup/recovery in a format that can be reviewed and signed off by the team. Running through the checklist before enabling production traffic catches configuration gaps that are cheap to fix before launch but expensive after.
