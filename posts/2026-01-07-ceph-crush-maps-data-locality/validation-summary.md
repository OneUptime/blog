# Validation Summary: How to Set Up Ceph CRUSH Maps for Data Locality Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS
- CRUSH maps and CRUSH rules
- crushtool
- Ceph OSD CLI commands
- Device classes and storage tiering
- Replicated and erasure-coded pool placement

## Sources Consulted
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph manual CRUSH map editing documentation: https://docs.ceph.com/en/reef/rados/operations/crush-map-edits/
- Ceph administration tool man page: https://docs.ceph.com/en/latest/man/8/ceph/
- crushtool man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- CRUSH algorithm paper: https://ceph.com/assets/pdfs/weil-crush-sc06.pdf

## Issues Found
- The custom CRUSH map example used bucket types such as `host`, `rack`, `datacenter`, and `root` without including the required `type` declarations in the map snippet. Added the bucket type declarations so the example is complete.
- The individual tunable command used `ceph osd crush tunables straw_calc_version 1`, but `tunables` accepts a profile name. Changed it to `ceph osd crush set-tunable straw_calc_version 1`, which is the documented command for setting that tunable.
- The production erasure-coding comment implied that the CRUSH rule itself configured 4+2 encoding. Updated the comment to clarify that 4+2 is set in the erasure-code profile and the CRUSH rule controls placement.
- The CRUSH algorithm paper URL returned 404 at the old `wp-content/uploads` path. Updated it to the current Ceph-hosted PDF URL.

## Review Notes
Most CLI examples match current Ceph documentation. The post uses manual CRUSH map editing examples, which Ceph documents as an advanced operation; for many modern deployments, equivalent CLI commands or erasure-code profiles are preferred where available.
