# How to Enable and Disable Ceph Manager Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Ceph Manager, Administration, Configuration

Description: Learn how to enable, disable, and manage the lifecycle of Ceph Manager modules to control which features and integrations are active in your cluster.

---

Ceph Manager modules are optional plugins that extend the manager's capabilities. Knowing how to enable and disable them safely is fundamental to Ceph administration, allowing you to activate monitoring integrations, disable unused features, and recover from misbehaving modules.

## Listing Module States

Before enabling or disabling modules, view all available modules and their current state:

```bash
ceph mgr module ls
```

This outputs three sections:

```json
{
  "always_on_modules": ["balancer", "crash", "devicehealth", "orchestrator", "pg_autoscaler"],
  "enabled_modules": ["dashboard", "prometheus", "telemetry"],
  "disabled_modules": ["influx", "iostat", "nfs", "rgw", "telegraf"]
}
```

- `always_on_modules` - built-in modules that cannot be disabled
- `enabled_modules` - currently active optional modules
- `disabled_modules` - available but inactive modules

## Enabling a Module

Enable a module by name:

```bash
ceph mgr module enable prometheus
```

The module starts immediately on the active manager. If the module has a background service (`serve()` method), it begins running.

## Disabling a Module

Disable a module to stop it and release its resources:

```bash
ceph mgr module disable prometheus
```

The module's `shutdown()` method is called, and it stops processing.

## Enabling with Force Flag

If a module fails validation checks (e.g., missing dependencies), use the force flag to enable it anyway:

```bash
ceph mgr module enable influx --force
```

Use this with caution as it bypasses safety checks.

## Always-On Modules

Some modules cannot be disabled because they provide core cluster functionality:

```bash
# This will fail
ceph mgr module disable balancer
# Error EINVAL: module 'balancer' cannot be disabled (always-on)
```

## Checking Module Status After Enable

After enabling a module, verify it is running correctly:

```bash
ceph mgr module ls | grep -A5 enabled_modules
ceph status
```

Look for health warnings that indicate a module failed to start:

```text
HEALTH_WARN  Module 'influx' has failed: connection refused
```

## Viewing Module Errors

If a module fails, check the manager logs for the error:

```bash
ceph log last 30 | grep -i "module\|mgr"
```

Or check manager logs directly on the node:

```bash
journalctl -u ceph-mgr@* --since "10 minutes ago"
```

## Summary

Ceph Manager modules are managed with `ceph mgr module enable` and `ceph mgr module disable` commands. The `ceph mgr module ls` command shows the current state of all modules divided into always-on, enabled, and disabled groups. Health warnings in `ceph status` indicate when a module has failed to start, and manager logs provide the underlying error details.
