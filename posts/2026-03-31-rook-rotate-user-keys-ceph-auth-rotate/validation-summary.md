# Validation Summary: How to Rotate User Keys with ceph auth rotate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (authentication subsystem, ceph-authtool, ceph auth commands)
- Rook (Ceph operator for Kubernetes, toolbox pod)
- Kubernetes (Secrets, CronJobs, rollout restart, JSON patch)

## Sources Consulted
- Ceph official documentation: User Management (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph official documentation: ceph-authtool man page (https://docs.ceph.com/en/latest/man/8/ceph-authtool/)
- Ceph CLI `ceph auth` subcommands reference
- Rook documentation: Ceph Toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

### 1. Non-existent `ceph auth rotate` command (Critical)
**What was wrong:** The entire post was built around `ceph auth rotate`, which does not exist as a Ceph command. There is no single command in Ceph to rotate a user's key in place.

**What was changed:** Replaced all references to `ceph auth rotate` with the correct three-step procedure:
1. `ceph auth get client.myapp -o /tmp/myapp.keyring` (export keyring with caps)
2. `ceph-authtool /tmp/myapp.keyring -n client.myapp --gen-key` (regenerate key in file)
3. `ceph auth import -i /tmp/myapp.keyring` (import updated keyring)

This affects the title, description, section headings, all code examples (rotation workflow, Kubernetes secret update, CronJob, custom key section), and the summary.

**Why:** `ceph auth rotate` would produce a "command not found" error. The correct approach uses `ceph-authtool` to regenerate keys in a keyring file and `ceph auth import` to apply them.

### 2. Incomplete custom key section
**What was wrong:** The "Alternative: Generate and Import a Custom Key" section only showed `ceph-authtool --gen-print-key` with comments about what to do but no actual working commands to apply the custom key.

**What was changed:** Replaced with a complete working example using `ceph-authtool --add-key` to set a specific key value in the keyring file before importing.

### 3. CronJob command updated
**What was wrong:** The CronJob used the non-existent `ceph auth rotate` command.

**What was changed:** Replaced with a multi-line bash script performing the correct three-step rotation procedure.

## Review Notes
- The zero-downtime pattern using a parallel user is a valid approach and was left unchanged.
- The `ceph auth print-key` and `ceph auth get` commands used in verification and secret update steps are correct.
- The Kubernetes Secret patching approach using JSON patch is correct.
- The Rook toolbox image `rook/ceph:v1.15.0` in the CronJob is a valid image reference, though users should match it to their deployed Rook version.
