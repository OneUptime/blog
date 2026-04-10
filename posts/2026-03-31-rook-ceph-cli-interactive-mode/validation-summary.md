# Validation Summary: How to Use the Ceph CLI in Interactive Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CLI (interactive and non-interactive modes)
- Kubernetes (kubectl exec, rollout status)
- Python (JSON parsing of Ceph output)

## Sources Consulted
- GitHub API for rook/rook repository (confirmed default branch is `master`) — https://api.github.com/repos/rook/rook
- Rook toolbox.yaml on GitHub — https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml (confirmed accessible)
- Ceph source code (`Monitor.cc`, `OSDMap.cc`) across Pacific, Quincy, Reef, and Squid branches to verify JSON output structure of `ceph status --format json`

## Issues Found
- **Incorrect OSD field in Python parsing example**: The original code used `data['osdmap']['num_osds']` with the label `'up'`, but `num_osds` represents the total number of existing OSDs (both up and down). Changed to `data['osdmap']['num_up_osds']` for the "up" count and added `data['osdmap']['num_osds']` with a "total" label to accurately represent both values. This prevents misleading output during cluster diagnostics where some OSDs may be down.

## Review Notes
- The toolbox.yaml URL correctly uses `master` — Rook's GitHub repository still uses `master` as its default branch (verified via GitHub API).
- All Ceph CLI commands shown (`status`, `health detail`, `osd pool ls`, `osd tree`, `pg stat`, `df`, `osd stat`, `osd pool ls detail`, `df detail`, `mon stat`) are valid commands in current Ceph releases.
- The `ceph` interactive shell behavior (REPL with tab completion, `quit`/Ctrl+D to exit) is accurately described.
- The `--format json` and `--format json-pretty` flags are correct.
- The `data['health']['status']` JSON path is correct for all modern Ceph versions.
- The OSD map JSON structure (`osdmap.num_osds`, `osdmap.num_up_osds`) has been stable across Pacific, Quincy, Reef, and Squid releases.
