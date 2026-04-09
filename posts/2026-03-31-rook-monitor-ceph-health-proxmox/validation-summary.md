# Validation Summary: How to Monitor Ceph Health from Proxmox

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Ceph (CLI tools, Prometheus module, Dashboard, PG management)
- Proxmox VE (Web UI, cron scheduling)
- Prometheus (scrape configuration)
- Grafana (dashboards)
- Bash scripting (health check automation)

## Sources Consulted
- Ceph Reef official documentation — Dashboard management: https://docs.ceph.com/en/reef/mgr/dashboard/
- Ceph Reef official documentation — Prometheus module: https://docs.ceph.com/en/reef/mgr/prometheus/
- Ceph Reef official documentation — PG troubleshooting: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-pg/
- Ceph Quincy official documentation — `ceph df` output format
- Proxmox VE documentation — Ceph management GUI: https://pve.proxmox.com/pve-docs/chapter-pveceph.html
- Proxmox VE documentation — GUI overview: https://pve.proxmox.com/wiki/Graphical_User_Interface

## Issues Found

### 1. Incorrect Proxmox Web UI navigation paths
**What was wrong:** The post listed Ceph monitoring paths as "Datacenter -> Ceph -> Status", "Datacenter -> Ceph -> OSD", and "Datacenter -> Ceph -> Pools". In Proxmox VE 7.x and 8.x, there is no "Datacenter -> Ceph" menu. Ceph management is exclusively at the node level.
**What was changed:** Corrected all navigation paths to use "Node -> Ceph" as the base path (e.g., "Node -> Ceph -> OSD", "Node -> Ceph -> Pools"). Replaced the redundant fourth item with "Node -> Ceph -> Monitor" for monitor daemon status.
**Why:** The Proxmox VE GUI chapter and official Ceph-on-Proxmox documentation confirm that Ceph panels (Status, OSD, Pools, Monitor, Config) are all accessed by selecting a node first, then navigating into that node's Ceph section.

### 2. Broken `ceph df detail` awk command for pool capacity
**What was wrong:** The command `ceph df detail | awk 'NR>2 && $6+0 > 70 {...}'` had two issues: (a) `NR>2` starts from the 3rd line of overall output, which is in the RAW STORAGE section, not the POOLS section; (b) `$6` does not correspond to the `%USED` column in Ceph Quincy/Reef — in `ceph df detail`, the POOLS section has expanded columns (DATA, OMAP sub-columns) making `%USED` approximately field 17, not field 6. The awk command would compare DATA sub-column values against the 70% threshold instead of actual pool usage.
**What was changed:** Replaced the awk command with a JSON-based approach using `ceph df --format json | python3 -c "..."` that parses `pool['stats']['percent_used']` from the structured output. This is reliable across Ceph versions.
**Why:** The `ceph df detail` text output format varies by Ceph version and has columns containing units (e.g., "1.0 GiB") that split into multiple awk fields, making positional field references unreliable. JSON output provides stable, version-independent field names.

### 3. Incorrect argument order in `ceph dashboard ac-user-create`
**What was wrong:** The command was `ceph dashboard ac-user-create admin administrator -i -`, which places the rolename (`administrator`) before the password input flag (`-i -`).
**What was changed:** Reordered to `ceph dashboard ac-user-create admin -i - administrator`, matching the documented syntax: `<username> -i <file> [<rolename>]`.
**Why:** Per the official Ceph Dashboard documentation (Quincy and Reef), the correct positional order is username, then `-i <password-file>`, then optional rolename.

## Review Notes
- The health check script calls `ceph health` twice (once for `HEALTH` variable, once for `STATUS`) and `HEALTH` is never used. This is inefficient but not incorrect.
- The Prometheus config snippet uses `cat >>` to append to `prometheus.yml`, which assumes `scrape_configs:` is the last section in the file. If other sections follow, this could break the YAML structure. A note about this caveat would be helpful.
- The `ceph pg dump_stuck` commands remain valid in Ceph Quincy and Reef.
- All verified metric names (`ceph_health_status`), port numbers (9283 for Prometheus, 8443 for Dashboard), and CLI commands (`ceph health`, `ceph -s`, `ceph osd tree`, `ceph -w`, `ceph pg stat`) are correct.
