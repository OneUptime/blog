# How to Prepare a Ceph Cluster for Production Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Production, Hardening, Operation

Description: Prepare a Ceph cluster for production traffic by hardening security, tuning performance settings, configuring alerting, and establishing operational procedures.

---

A Ceph cluster that passes validation is not automatically ready for production traffic. Hardening, tuning, and operational readiness are separate concerns that require explicit attention before going live.

## Security Hardening

### CephX Authentication

Verify authentication is enforced:

```bash
ceph config get global auth_cluster_required
ceph config get global auth_service_required
ceph config get global auth_client_required
# All should return "cephx"
```

### Scope Client Keyrings

Create application-specific keyrings with minimum required permissions:

```bash
# Read-only client for monitoring
ceph auth get-or-create client.monitor \
  osd "allow r" \
  mon "allow r" \
  > /etc/ceph/ceph.client.monitor.keyring

# Read/write client for a specific pool
ceph auth get-or-create client.appname \
  osd "allow rw pool=apppool" \
  mon "allow r" \
  > /etc/ceph/ceph.client.appname.keyring
```

## Performance Tuning

### BlueStore Cache

Set appropriate BlueStore cache based on available RAM:

```bash
# For NVMe OSDs with 32 GB RAM per OSD node
ceph config set osd bluestore_cache_size_ssd 4294967296  # 4 GB per OSD

# For HDD OSDs
ceph config set osd bluestore_cache_size_hdd 1073741824  # 1 GB per OSD
```

### Recovery Throttling

Prevent recovery from overwhelming production I/O:

```bash
ceph config set osd osd_recovery_max_active_hdd 3
ceph config set osd osd_recovery_max_active_ssd 10
ceph config set osd osd_max_backfills 1
```

### PG Auto-scaling

Enable PG auto-scaling for hands-off PG management:

```bash
ceph osd pool set replicapool pg_autoscale_mode on
ceph osd pool autoscale-status
```

## Operational Readiness

### Runbooks

Ensure runbooks exist for the most common incidents:

```text
- OSD Down
- Near-Full Pool
- MON Quorum Loss
- PGs Stuck Inactive
- Slow Request Flood
```

### Monitoring Verification

```bash
# Verify Prometheus is scraping Ceph metrics
curl -s http://prometheus:9090/api/v1/targets | python3 -m json.tool | grep -A 3 "ceph"

# Verify alerts are configured
curl -s http://prometheus:9090/api/v1/rules | python3 -m json.tool | grep '"name"'
```

### On-Call Setup

```text
[ ] Alert routing configured to notify on-call rotation
[ ] PagerDuty or equivalent configured for HEALTH_ERR alerts
[ ] Escalation path defined for data loss scenarios
[ ] Contact list for Ceph vendor or community support bookmarked
```

## Traffic Ramp-Up

Do not move full production traffic immediately. Ramp up gradually:

```bash
# Start with 10% of traffic
# Monitor:
watch -n 10 ceph status
watch -n 30 "ceph osd perf | head -20"

# Check for slow requests developing
ceph health detail | grep slow
```

## Final Pre-Traffic Checklist

```bash
ceph health          # HEALTH_OK
ceph quorum_status   # All MONs in quorum
ceph osd stat        # All OSDs up and in
ceph pg stat         # All PGs active+clean
ceph df              # Usage below 60%
```

## Summary

Preparing Ceph for production traffic requires security hardening with scoped keyrings, performance tuning for BlueStore cache and recovery throttling, operational readiness through runbooks and monitoring verification, and a gradual traffic ramp-up while monitoring slow requests and OSD performance. Rushing any of these steps is the most common cause of production Ceph incidents in the first week after launch.
