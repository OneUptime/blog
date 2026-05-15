# Validation Summary: How to Add and Manage OSDs in a Ceph Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage
- Cephadm
- Ceph Orchestrator
- Ceph OSDs
- CRUSH maps and device classes

## Sources Consulted
- Ceph documentation: OSD Service, https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph documentation: CRUSH Maps, https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph documentation: Monitor command API for Ceph Orchestrator commands, https://docs.ceph.com/en/latest/api/mon_command_api/
- Red Hat Ceph Storage 8 Operations Guide: Management of OSDs using the Ceph Orchestrator, https://docs.redhat.com/en/documentation/red_hat_ceph_storage/8/html-single/operations_guide/index

## Issues Found
- The host-specific device listing used `ceph orch device ls node2`. Current Ceph command documentation shows host filtering with the `--hostname` option, so this was changed to `ceph orch device ls --hostname node2`.
- The OSD removal flow used manual `ceph osd out`, `ceph orch daemon rm`, and `ceph osd purge` commands. Current Cephadm and Red Hat Ceph guidance recommends orchestrated OSD removal with `ceph orch osd rm OSD_ID --zap`, which drains and removes the OSD, with progress checked through `ceph orch osd rm status`. The removal example was updated accordingly.
- The failed disk replacement flow used `ceph osd destroy osd.5 --yes-i-really-mean-it`. Current Cephadm and Red Hat Ceph guidance recommends `ceph orch osd rm OSD_ID --replace` to preserve the OSD ID for reuse and keep the replacement workflow orchestrator-aware. The replacement example was updated accordingly.

## Review Notes
The remaining commands for adding OSDs, checking OSD status, viewing device classes, creating a class-specific replicated CRUSH rule, and reweighting OSDs align with current Ceph and Red Hat Ceph documentation. For larger clusters, Red Hat recommends OSD specification files instead of broad `--all-available-devices` deployment.
