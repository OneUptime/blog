# Validation Summary: How to Let the Balancer Module Manage CRUSH Weights Automatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Ceph Balancer mgr module
- CRUSH (Controlled Replication Under Scalable Hashing) algorithm
- Rook (Kubernetes Ceph operator)

## Sources Consulted
- Official Ceph Balancer documentation: https://docs.ceph.com/en/reef/rados/operations/balancer/
- Ceph Quincy balancer docs: https://docs.ceph.com/en/quincy/rados/operations/balancer/
- Ceph source code: `src/pybind/mgr/balancer/module.py` (mode definitions, config options)
- Ceph source code: `src/mon/MgrMonitor.cc` (always-on module list)
- Ceph Nautilus release notes (deprecation of `mgr/balancer/max_misplaced`)

## Issues Found

### 1. Unnecessary `ceph mgr module enable/disable balancer` commands
**What was wrong:** The post instructed readers to enable the balancer with `ceph mgr module enable balancer` and disable it with `ceph mgr module disable balancer`. Since Nautilus (v14.2.x), the balancer is an always-on mgr module that is automatically loaded and cannot be disabled.
**What was changed:** Removed the enable command and added a note that the module is always-on since Nautilus. Replaced the disable section with a note explaining that `ceph balancer off` is the correct way to stop automatic balancing.

### 2. `ceph balancer mode` without arguments does not list modes
**What was wrong:** The post had `ceph balancer mode` with the comment "Check available modes." This command is a setter that requires a mode argument; running it without one produces an error.
**What was changed:** Removed the incorrect command. Added a note that `ceph balancer status` shows the current mode.

### 3. Incorrect description of `sleep_interval`
**What was wrong:** The post described `sleep_interval` as controlling "how aggressively the balancer runs (0-1, default 0.5)." In reality, `sleep_interval` is the number of seconds the balancer sleeps between optimization runs (default 60). The "0-1, default 0.5" description matches `crush_compat_step`, a different config option.
**What was changed:** Updated the comment to correctly describe `sleep_interval` as the interval in seconds between balancer runs (default 60).

### 4. Obsolete `max_misplaced` config key
**What was wrong:** The post used `ceph config set mgr mgr/balancer/max_misplaced 0.05`. This module-specific option was replaced by the global `target_max_misplaced_ratio` option in Nautilus.
**What was changed:** Updated the command to `ceph config set mgr target_max_misplaced_ratio 0.05` with an accurate description.

### 5. Incorrect pool exclusion method using `nopgchange`
**What was wrong:** The post claimed `ceph osd pool set mypool nopgchange true` excludes a pool from the balancer. The `nopgchange` flag only prevents changes to `pg_num`/`pgp_num` and has nothing to do with the balancer's upmap or crush-compat operations.
**What was changed:** Replaced the entire section with the correct methods: using `mgr/balancer/pool_ids` config for pool ID inclusion lists, and `ceph balancer pool add/rm` CLI commands for managing individual pools.

### 6. Misleading "pre-Luminous" compatibility claim for crush-compat
**What was wrong:** The post described crush-compat as being for "older clients (pre-Luminous)." The balancer module itself was introduced in Luminous, so "pre-Luminous" is misleading. What's accurate is that crush-compat produces maps that older *clients* can still read.
**What was changed:** Removed the "(pre-Luminous)" qualifier from the crush-compat description.

### 7. Inaccurate version claim about upmap preference
**What was wrong:** The post stated "upmap mode is preferred for Luminous and later." While upmap has been available since Luminous, it did not become the default mode until Pacific (v16.2.0).
**What was changed:** Updated to note that upmap has been the default since Pacific and requires all clients to be Luminous or newer.

## Review Notes
- The post does not mention the newer `read` and `upmap-read` balancer modes available in Reef and later, which optimize read distribution by adjusting primary OSD selection. This is not an error but could be a useful addition for readers on newer clusters.
- The `ceph osd df | sort -k 6 -n` command in the monitoring section assumes a specific column layout that may vary across Ceph versions. The column index for %USE may differ.
