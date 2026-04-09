# Validation Summary: How to Force RBD Image Resync

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Ceph RBD Mirroring
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- jq (JSON processor)
- Bash scripting

## Sources Consulted
- Ceph RBD Mirroring Documentation: https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst
- Ceph rbd man page: https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst
- Ceph librbd.h mirror state enum: https://github.com/ceph/ceph/blob/main/src/include/rbd/librbd.h
- Ceph MirrorImage.cc (registered subcommands): https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/MirrorImage.cc
- Ceph MirrorPool.cc (JSON output structure): https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/MirrorPool.cc
- Ceph rbd_mirroring.py (dashboard bootstrap regex for description format): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/controllers/rbd_mirroring.py
- Ceph RBD config options (rbd.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/rbd.yaml.in
- Ceph Bug Tracker #16855 (up+error state): https://tracker.ceph.com/issues/16855

## Issues Found

1. **`rbd mirror image ls` command does not exist** (lines 65-66): The blog used `rbd mirror image ls -p $POOL --format json` to list mirrored images in error state. This command does not exist in Ceph. The registered `mirror image` subcommands are: enable, disable, promote, demote, resync, status, and snapshot. Fixed to use `rbd mirror pool status $POOL --verbose --format json`, which returns a JSON object with an `images` array containing per-image state.

2. **Incorrect jq JSON path and state filter** (line 66): The original jq filter was `.[] | select(.state == "error") | .name`. Two problems: (a) the JSON structure from `rbd mirror pool status --verbose` nests images under `.images[]`, not `.[]`; (b) mirror states include the up/down prefix (e.g., `"up+error"`, not bare `"error"`). Fixed to `.images[] | select(.state | contains("error")) | .name`.

3. **Incorrect resync state progression** (lines 50-53): The blog listed the progression as: `syncing` → `up+syncing` → `up+replaying`. The bare `syncing` state without a prefix is inaccurate when the daemon is running — it would be `up+syncing` from the start. Also missing the `up+starting_replay` intermediate state. Fixed to: `up+syncing` → `up+starting_replay` → `up+replaying`.

4. **Description format included extraneous "complete"** (line 83): The resync progress description was shown as `bootstrapping, IMAGE_COPY/COPY_OBJECT 45% complete`. Per the Ceph dashboard source code regex, the actual format is `bootstrapping, IMAGE_COPY/COPY_OBJECT 45%` without the word "complete". Fixed.

5. **`rbd_journal_order` set to default value** (line 108): The blog said "Increase the journal object order" but set it to 24, which is already the default (valid range: 12-26). Changed to 26 (2^26 = 64MiB journal objects) to actually demonstrate an increase.

6. **`rbd_journal_commit_age` set to default value** (line 111): The blog set this to 5, which is already the default (5 seconds). Changed to 10 to demonstrate actual tuning for more write batching.

## Review Notes
- The core commands (`rbd mirror pool status`, `rbd mirror image status`, `rbd mirror image resync`) are all correct and well-documented.
- The Rook toolbox section uses the correct label selector (`app=rook-ceph-tools`) and namespace (`rook-ceph`).
- The explanation of when to use resync (split-brain, stuck error states, journal corruption) is accurate.
- The `up+error` and `up+stopped` states mentioned as common error indicators are both real Ceph mirror states.
- The claim that resync must be run on the secondary cluster is correct — the command flags the local (non-primary) image for re-synchronization from the remote primary.
