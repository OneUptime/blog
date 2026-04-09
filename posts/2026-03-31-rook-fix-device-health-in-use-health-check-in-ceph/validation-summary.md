# Validation Summary: How to Fix DEVICE_HEALTH_IN_USE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster, health checks, OSD management, devicehealth module)
- Rook (Kubernetes Ceph operator, toolbox pod, OSD pod management)
- SMART (disk health monitoring via smartctl)
- Kubernetes (kubectl commands for Rook-managed clusters)

## Sources Consulted
- Ceph Device Management Documentation: https://docs.ceph.com/en/latest/rados/operations/devices/
- Ceph Adding/Removing OSDs Documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph devicehealth module source (module.py): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- S.M.A.R.T. specification (Attribute 197 - Current Pending Sector Count): https://en.wikipedia.org/wiki/Self-Monitoring,_Analysis_and_Reporting_Technology
- Ceph CLI man page (pg dump subcommands): https://docs.ceph.com/en/quincy/man/8/ceph/

## Issues Found

### 1. Incorrect SMART attribute name
- **What was wrong:** The post referenced the SMART attribute as `Pending_Sector`, which is not the correct attribute name.
- **What was changed:** Corrected to `Current_Pending_Sector` (SMART Attribute ID 197), which is the name shown in `smartctl` output.
- **Why:** Using the wrong attribute name would cause readers to look for a field that doesn't exist in smartctl output.

### 2. OSD removal command order and unnecessary command
- **What was wrong:** The OSD removal sequence listed `ceph osd down osd.2` (unnecessary, as the OSD is marked down automatically when the daemon stops) and placed `ceph osd rm` before `ceph osd crush remove` and `ceph auth del`, which is contrary to the official Ceph documentation.
- **What was changed:** Removed the unnecessary `ceph osd down` command and reordered to: `ceph osd crush remove` -> `ceph auth del` -> `ceph osd rm`, matching the standard documented procedure.
- **Why:** The official Ceph docs recommend removing from CRUSH map and deleting auth keys before removing the OSD from the OSD map. Running `osd rm` first could cause subsequent commands to behave unexpectedly in some Ceph versions.

## Review Notes
- The `ceph osd purge osd.{id} --yes-i-really-mean-it` command is the modern preferred approach for OSD removal, as it combines `crush remove`, `auth del`, and `osd rm` into one step. The post uses the manual multi-step approach, which is valid and more educational but readers should be aware the single-command alternative exists.
- The `ceph health detail` example output uses illustrative wording that may differ slightly from actual Ceph output depending on the version. This is acceptable for a tutorial.
- The devicehealth configuration options (`mark_out_threshold`, `self_heal`, `scrape_frequency`) were verified against the Ceph source and are all correct with valid value formats.
- All kubectl commands for Rook (toolbox exec, pod deletion by label, operator restart) use correct syntax and label selectors.
