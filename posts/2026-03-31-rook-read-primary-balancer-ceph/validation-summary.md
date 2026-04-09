# Validation Summary: How to Operate the Read (Primary) Balancer in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (Squid 19.x and later; Reef 18.x offline tool)
- Ceph Balancer Module (read mode)
- Ceph CLI (`ceph balancer`, `ceph osd df`, `ceph pg dump`, `ceph config set`)
- Rook (mentioned in tags but not directly in content)
- Kubernetes (mentioned in tags but not directly in content)

## Sources Consulted
- Ceph Reef Balancer Module documentation: https://docs.ceph.com/en/reef/rados/operations/balancer/
- Ceph Reef Read Balancer documentation: https://docs.ceph.com/en/reef/rados/operations/read-balancer/ (confirms offline-only in Reef: "At present, there is no online option for the read balancer")
- Ceph Squid Balancer Module documentation: https://docs.ceph.com/en/squid/rados/operations/balancer/ (confirms `read` and `upmap-read` modes added in Squid)
- Ceph Reef Monitoring OSDs documentation: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph balancer module source code (module.py): https://github.com/ceph/ceph/blob/reef/src/pybind/mgr/balancer/module.py
- Ceph Prometheus module source code: https://github.com/ceph/ceph/blob/reef/src/pybind/mgr/prometheus/module.py

## Issues Found

1. **Incorrect Ceph version for online read balancer (Major)**
   - **What was wrong:** The post stated the read balancer "became generally available in Ceph Reef (18.x)." In Reef, only an offline read balancing tool was available via `osdmaptool --read`. The online `ceph balancer mode read` command was introduced in Ceph Squid (19.x).
   - **What was changed:** Updated the version reference to Ceph Squid (19.x) and noted the offline Reef tool for completeness.
   - **Why:** The Reef documentation explicitly states "At present, there is no online option for the read balancer." All commands in the post (`ceph balancer mode read`, etc.) are Squid-era features.

2. **Incorrect description of upmap mode**
   - **What was wrong:** The post described `upmap` mode as being for "write load."
   - **What was changed:** Changed to "even PG data distribution" since `upmap` optimizes PG placement across OSDs for balanced data distribution, not specifically write load.
   - **Why:** The official Ceph docs describe `upmap` as optimizing "the placement of individual PGs in order to achieve a balanced distribution."

3. **Misleading PRI-AFF column description**
   - **What was wrong:** The post said to "Look at the `PRI-AFF` column and compare read utilization." PRI-AFF is a primary affinity weight (0.0-1.0), not a read utilization metric.
   - **What was changed:** Clarified that PRI-AFF shows primary affinity and should be checked to verify all OSDs have the default affinity of 1.
   - **Why:** PRI-AFF is a configuration weight, not a utilization metric. Misunderstanding this could lead operators to look at the wrong data.

4. **Non-existent Prometheus metric removed**
   - **What was wrong:** The post referenced `ceph_mgr_balancer_score` as a Prometheus metric. This metric does not exist in the Ceph Prometheus module.
   - **What was changed:** Removed the Prometheus metric reference.
   - **Why:** The Ceph Prometheus module source code contains no balancer-related metrics. Referencing a non-existent metric would confuse operators trying to set up monitoring.

## Review Notes
- The `awk` command `ceph pg dump | awk '/^[0-9]/{print $14}'` uses a hardcoded column number ($14) to extract the primary OSD. The column position in `ceph pg dump` text output is version-dependent and not documented by column number. Column 14 may not correspond to the acting primary in Squid. Users may need to inspect the header row and adjust the column number. A more robust approach would be to use JSON output: `ceph pg dump --format json`.
- The `ceph balancer optimize` and `ceph balancer execute` commands are correctly documented per official Ceph docs.
- The `mgr/balancer/min_score` and `mgr/balancer/sleep_interval` config keys are confirmed correct.
- The post mentions Rook and Kubernetes in tags but does not include any Rook-specific or Kubernetes-specific commands. The content is pure Ceph CLI operations.
