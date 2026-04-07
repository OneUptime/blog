# Validation Summary: How to Trigger Manual Scrub on Specific PGs

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (placement groups, scrubbing, OSDs)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec into toolbox pod)
- Bash scripting (awk, xargs, for loops within kubectl exec)

## Sources Consulted
- Ceph official documentation on PG scrubbing: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph CLI reference for `ceph pg` subcommands: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#scrubbing
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The `watch` command used in the monitoring section may not be available in all versions of the rook-ceph-tools container image. If missing, users can substitute a `while true; do ... sleep 2; done` loop.
- All Ceph commands (`ceph pg scrub`, `ceph pg deep-scrub`, `ceph pg ls-by-osd`, `ceph pg ls-by-pool`, `ceph osd pool scrub`, `ceph osd pool deep-scrub`, `ceph pg query`) are valid and current across recent Ceph releases (Quincy, Reef, Squid).
- Shell escaping within `kubectl exec -- bash -c` is handled correctly in all examples.
