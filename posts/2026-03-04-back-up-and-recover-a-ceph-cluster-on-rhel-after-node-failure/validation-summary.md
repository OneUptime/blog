# Validation Summary: How to Back Up and Recover a Ceph Cluster on RHEL After Node Failure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage / Ceph
- Ceph monitor, OSD, CRUSH, and authentication maps
- Cephadm orchestrator
- cron and systemd

## Sources Consulted
- Ceph documentation, "ceph -- ceph administration tool": https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation, "MON Service": https://docs.ceph.com/en/latest/cephadm/services/mon/
- Ceph documentation, "OSD Service": https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph documentation, "Adding/Removing Monitors": https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph documentation, "Adding/Removing OSDs": https://docs.ceph.com/en/quincy/rados/operations/add-or-rm-osds/
- Ceph documentation, "Monitor Command API": https://docs.ceph.com/en/latest/api/mon_command_api/
- Red Hat Ceph Storage 9 Operations Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/9/pdf/operations_guide/Red_Hat_Ceph_Storage-9-Operations_Guide-en-US.pdf

## Issues Found
- The emergency monitor recovery example injected a modified monmap without first stopping monitor daemons. Ceph documentation states that all monitor daemons should be stopped before this recovery workflow and warns not to inject into a running monitor. I added `sudo systemctl stop ceph-mon.target` before extracting and injecting the monmap, and clarified that only the surviving monitor should be started afterward.
- The `monmaptool` commands modify a root-owned recovery artifact in many RHEL/Ceph deployments. I added `sudo` to those commands to match the surrounding recovery commands.

## Review Notes
The post uses cephadm-era commands such as `ceph orch host add`, `ceph orch daemon add osd`, and `ceph orch daemon add mon`, which match current Ceph documentation. For production OSD replacement, Red Hat and upstream Ceph also document orchestrator-driven replacement flows such as `ceph orch osd rm <id> --replace` and device replacement workflows that preserve OSD IDs; the post's purge-and-add example is valid for removing failed OSD IDs, but preserving IDs may be preferable in some environments.
