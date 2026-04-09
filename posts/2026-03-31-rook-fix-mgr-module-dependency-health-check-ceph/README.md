# How to Fix MGR_MODULE_DEPENDENCY Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Manager, Module, Dependency

Description: Learn how to resolve the MGR_MODULE_DEPENDENCY health warning in Ceph when a manager module has unmet dependencies preventing it from loading correctly.

---

## Understanding MGR_MODULE_DEPENDENCY

`MGR_MODULE_DEPENDENCY` fires when a Ceph MGR module cannot load because one of its dependencies is missing or incompatible. This could mean a required Python library is absent, a required sibling module is disabled, or the module requires a specific Ceph version feature that is not available.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 1 mgr modules have failed dependencies
[WRN] MGR_MODULE_DEPENDENCY: 1 mgr modules have failed dependencies
    module 'dashboard' has failed dependency: No module named 'cherrypy'
```

## Listing Module Status

Check the status of all MGR modules:

```bash
ceph mgr module ls
```

This shows enabled, disabled, and always-on modules. Look for modules that are enabled but failing:

```bash
ceph mgr module ls | python3 -m json.tool | grep -A5 enabled_modules
```

## Identifying the Dependency Chain

Some modules have dependencies that prevent them from loading. Check the `can_run` status of all modules:

```bash
ceph mgr module ls --format=json-pretty
```

Disabled modules include `can_run` and `error_string` fields showing whether dependencies are met. Common dependency issues:
- `dashboard` requires Python packages such as `cherrypy`, `routes`, and `PyOpenSSL`
- `diskprediction_local` requires `numpy`, `scipy`, and `scikit-learn`
- `restful` requires `pecan` and `PyOpenSSL`

## Enabling Missing Dependencies

Enable the missing dependency module:

```bash
# Example: enable the restful module
ceph mgr module enable restful

# Enable the dashboard module
ceph mgr module enable dashboard
```

Verify after enabling:

```bash
ceph mgr module ls | grep -E "restful|dashboard"
```

## Fixing Python Library Dependencies

Some modules require Python libraries installed on the MGR host. In Rook, the MGR runs in a container - missing libraries should not occur unless using a custom image.

Check for import errors in MGR logs:

```bash
kubectl -n rook-ceph logs <mgr-pod> | grep -i "ImportError\|ModuleNotFoundError"
```

If a library is missing, switch to the official Ceph container image:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type=merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v18.2.0"}}}'
```

## Disabling the Dependent Module

If the dependency cannot be satisfied (e.g., a required Python package is unavailable), disable the dependent module:

```bash
ceph mgr module disable dashboard
```

Verify cluster health improves:

```bash
ceph health detail
```

## Re-enabling in the Correct Order

If multiple modules have a dependency chain, enable them in order:

```bash
# Enable modules without dependencies first
ceph mgr module enable restful
ceph mgr module enable iostat

# Then enable modules that depend on them
ceph mgr module enable dashboard
ceph mgr module enable pg_autoscaler
```

## Checking Module Errors After Enabling

After enabling dependencies, check for remaining errors:

```bash
ceph mgr module ls --format=json-pretty
ceph health detail
```

Any module that failed to load will show `can_run: false` with an error string in the module listing.

## Summary

`MGR_MODULE_DEPENDENCY` fires when a MGR module's required dependencies are not met. Identify the failing module and its dependencies using `ceph mgr module ls --format=json-pretty`, then install missing Python packages or enable missing dependency modules in the correct order. If a Python library is missing, ensure you are using the official Ceph container image. If the dependency cannot be satisfied, disable the dependent module to clear the health warning.
