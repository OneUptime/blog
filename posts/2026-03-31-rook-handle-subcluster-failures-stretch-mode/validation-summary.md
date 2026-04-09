# Validation Summary: How to Handle Subcluster Failures in Stretch Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (stretch mode, OSDs, PGs, CRUSH, monitors)
- Rook (Ceph orchestration on Kubernetes)
- Bash scripting (for OSD management scripts)
- Python 3 (inline JSON parsing in shell script)

## Sources Consulted
- Ceph official stretch mode documentation: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph source code: `src/mon/OSDMonitor.cc` — `trigger_degraded_stretch_mode()` function (lines ~15729-15760)
- Ceph health checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph OSD management commands: https://docs.ceph.com/en/latest/rados/operations/control/

## Issues Found

### 1. Incorrect claim that degraded stretch mode only allows reads (line 21)
- **What was wrong:** The post stated that Ceph "Reduces `min_size` on pools temporarily to allow reads from site B." In degraded stretch mode, `min_size` is reduced (halved to 1), and the surviving site serves both reads AND writes, not just reads.
- **What was changed:** Updated to "Enters degraded stretch mode, reducing `min_size` on pools to allow continued reads and writes from site B."
- **Why:** A reader could incorrectly believe the cluster becomes read-only during a site failure. Degraded stretch mode allows full I/O from the surviving site.

### 2. Incorrect claim about PGs having all copies on one site (line 22)
- **What was wrong:** The post stated "Halts writes to PGs that have all copies on site A." In a properly configured stretch mode cluster, CRUSH rules enforce that replicas are distributed across both sites. No PG should have all copies on a single site.
- **What was changed:** Updated to "Marks affected PGs as `active+undersized+degraded` until the site recovers."
- **Why:** The original claim described a scenario that cannot occur in a correctly configured stretch cluster. The actual behavior is that PGs become undersized (missing copies from the down site) but remain active.

### 3. Inaccurate health warning description (line 20)
- **What was wrong:** The post stated Ceph "Sets the `HEALTH_WARN` flag with `1 site is down`." There is no stretch-specific health check with that exact message. When a site fails, the health warnings come from standard PG health checks (e.g., `PG_DEGRADED`, undersized PG warnings).
- **What was changed:** Updated to "Raises `HEALTH_WARN` with degraded and undersized PG warnings."
- **Why:** The original text cited a non-existent health check message, which could confuse operators looking for that specific alert.

### 4. Misleading claim about automatic rebalancing (rebalancing section)
- **What was wrong:** The post stated "By default, Ceph will start backfilling after OSDs are marked down," implying that manual intervention with `noout`/`norebalance` is required. In stretch mode, the degraded stretch mode mechanism automatically prevents rebalancing — it uses a special OSDMap flag rather than the standard OSD flags. Additionally, `mon_osd_min_in_ratio` (default 0.75) prevents OSDs from being marked out when more than 25% go down.
- **What was changed:** Updated to clarify that stretch mode automatically prevents rebalancing, but the flags are recommended as an extra precaution.
- **Why:** The original text could lead operators to believe stretch mode lacks built-in rebalancing protection, when it actually handles this automatically.

## Review Notes
- The `ceph osd df | grep -v "up"` command works but is fragile — `grep -v "up"` could accidentally filter lines containing "up" in other contexts (e.g., hostnames). A more precise filter like `grep "down"` or column-based filtering with `awk` would be more robust. Not changed as it's a minor style concern.
- The permanent site loss script assumes the CRUSH hierarchy uses "datacenter" as a bucket type name (`d['crush_location'].get('datacenter','')`). This is a reasonable assumption for stretch mode setups but may need adjustment for clusters using different CRUSH type names (e.g., "site", "zone").
- The `ceph osd purge osd.X --yes-i-really-mean-it` command uses a placeholder `osd.X` — this is appropriate for documentation purposes and is clearly illustrative.
- All other CLI commands (`ceph health detail`, `ceph osd tree`, `ceph pg stat`, `ceph osd set noout`, `ceph osd unset noout`, `ceph -w`, etc.) are syntactically correct and current.
