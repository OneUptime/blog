# Validation Summary: How to Recover from Inconsistent PGs in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (placement groups, scrubbing, OSD management)
- Rook (Kubernetes Ceph operator)
- RADOS (Reliable Autonomic Distributed Object Store)
- Kubernetes (kubectl, toolbox pod)
- ceph-objectstore-tool
- smartctl (disk health monitoring)

## Sources Consulted
- Ceph official documentation on `rados list-inconsistent-obj` command syntax: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph documentation on `ceph-objectstore-tool`: https://docs.ceph.com/en/latest/man/8/ceph-objectstore-tool/
- Ceph documentation on pool deep-scrub: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph documentation on PG repair: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph scrubbing configuration reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/

## Issues Found

1. **Incorrect `rados list-inconsistent-obj` syntax** (two occurrences): The command was written as `rados list-inconsistent-obj <pool-name> --pgid 3.4f`. The correct syntax takes the PG ID as a positional argument directly: `rados list-inconsistent-obj 3.4f`. The pool is already encoded in the PG ID. Fixed both in the investigation section and the Rook section.

2. **Non-existent `ceph daemon osd.2 export_group` command**: The `export_group` admin socket command does not exist. Replaced with the correct tool `ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-2 --pgid 3.4f --op export --file /tmp/pg-3.4f-export`, which is the proper way to export PG data from an OSD. Added a note that the OSD must be stopped when using this tool.

3. **`ceph osd pool scrub` instead of `ceph osd pool deep-scrub`**: The comment said "Deep scrub all PGs in a pool" but the command `ceph osd pool scrub` only initiates a regular (shallow) scrub. Changed to `ceph osd pool deep-scrub` to match the stated intent.

4. **Minor comment fix**: Changed "List inconsistent objects in a specific PG" to "List inconsistent PGs in a specific pool" for the `rados list-inconsistent-pg` command, which lists PGs not objects.

## Review Notes
- The `ceph pg dump | awk` command for counting inconsistent objects references column `$21` which may vary across Ceph versions. This is acceptable as a general example but readers should verify column positions for their version.
- The `osd_scrub_min_interval` config (604800s = 1 week) is described as "Weekly" in a comment. This is the minimum interval between scrubs, not a guaranteed schedule — scrubs may be delayed by load. The comment is acceptable shorthand but could be more precise.
- The toolbox YAML URL points to the `master` branch of the Rook repo. This works but may change; users on specific Rook versions should use the corresponding release branch URL.
