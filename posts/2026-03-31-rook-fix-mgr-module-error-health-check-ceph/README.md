# How to Fix MGR_MODULE_ERROR Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Manager, Module, Error

Description: Learn how to diagnose and resolve the MGR_MODULE_ERROR health warning in Ceph when a manager module encounters a runtime error or exception.

---

## Understanding MGR_MODULE_ERROR

`MGR_MODULE_ERROR` fires when a Ceph MGR module encounters an unhandled exception or runtime error during operation. Unlike `MGR_MODULE_DEPENDENCY` which is about missing prerequisites, this warning means the module loaded but then failed during execution - often due to a bug, configuration issue, or unexpected cluster state.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN mgr module error
[WRN] MGR_MODULE_ERROR: Module 'pg_autoscaler' has failed with an error
    Error: ZeroDivisionError: division by zero in autoscaler calc
```

## Identifying the Failing Module

List enabled modules and check for errors:

```bash
ceph mgr module ls
```

Get detailed module status including error messages:

```bash
ceph mgr module ls
```

Check MGR logs for the full traceback:

```bash
# In Rook
kubectl -n rook-ceph logs <mgr-pod> | grep -A 20 "Traceback\|Error in module"

# On bare metal
journalctl -u ceph-mgr@$(hostname) | grep -A 20 "Traceback"
```

## Quick Fix: Disable and Re-enable the Module

Often, disabling and re-enabling the module clears transient errors:

```bash
ceph mgr module disable pg_autoscaler
ceph mgr module enable pg_autoscaler
```

Check if the error clears:

```bash
ceph health detail
```

## Module-Specific Fixes

### pg_autoscaler errors

If the autoscaler fails due to pool configuration:

```bash
# Check pool autoscaling settings
ceph osd pool autoscale-status

# Disable autoscaling on the problematic pool
ceph osd pool set <pool-name> pg_autoscale_mode off
```

### dashboard errors

If the dashboard module fails:

```bash
# Reset dashboard SSL certificates
ceph dashboard create-self-signed-cert

# Or disable SSL
ceph config set mgr mgr/dashboard/ssl false

# Restart the module
ceph mgr module disable dashboard
ceph mgr module enable dashboard
```

### balancer errors

If the balancer fails:

```bash
# Check balancer status
ceph balancer status

# Disable the balancer
ceph balancer off

# Re-enable after investigation
ceph balancer on
```

## Checking Module Configuration

Some modules fail due to incorrect configuration parameters:

```bash
ceph config-key dump | grep mgr/
```

Reset a module's configuration to defaults:

```bash
ceph config rm mgr mgr/<module-name>/<config-key>
```

## Forcing MGR Failover

If the active MGR is stuck with the module error, force a failover to the standby:

```bash
ceph mgr fail $(ceph mgr stat | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['active_name'])")
```

The standby will become active and modules will reinitialize.

## Monitoring Module Health

Add Prometheus alerting for module errors:

```yaml
- alert: CephMgrModuleError
  expr: ceph_health_detail{name="MGR_MODULE_ERROR"} == 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Ceph MGR module has encountered an error"
    description: "Run 'ceph health detail' for specifics."
```

## Summary

`MGR_MODULE_ERROR` indicates a runtime failure in a Ceph MGR module. Start by checking the MGR logs for a Python traceback to identify the root cause. Disable and re-enable the failing module to clear transient errors. For persistent failures, check and reset module configuration, address pool-level settings for autoscaler issues, or force MGR failover to let the standby reinitialize cleanly.
