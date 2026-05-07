# Validation Summary: How to Restore a Checkpointed Container with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux containers
- Container checkpoint and restore
- Container networking and volume mounts

## Sources Consulted
- Podman official checkpointing guide: https://podman.io/docs/checkpoint
- Podman official `podman-container-restore` manual: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman official `podman-container-checkpoint` manual: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- CRIU Podman integration documentation: https://www.criu.org/Podman

## Issues Found
- The prerequisites stated that CRIU 3.15 or later is required. The official Podman checkpointing guide and CRIU Podman notes state that basic checkpoint/restore requires CRIU 3.11 or later, so the prerequisite was corrected to CRIU 3.11 or later.
- The "Restore with Resource Adjustments" section claimed resource limits can be adjusted during restore. The current Podman restore documentation does not list resource-limit override options; it does document limited restore-time changes such as `--publish` when restoring from an exported checkpoint or checkpoint image. The section was corrected to describe configuration constraints and the documented `--publish` exception.
- The debugging and repeated-restore guidance said a checkpointed container could be restored multiple times without explaining the default checkpoint consumption behavior or the `--keep` option. The text and example were updated to mention `--keep`, exported checkpoints, and the need to stop the restored local container before restoring the same local checkpoint again.
- The network-conflict note implied any restored container may conflict on IP address. Podman's restore documentation specifically calls out static IP restoration with `--ip`; the text was narrowed to static IP address conflicts.

## Review Notes
- Podman was not installed in the local validation environment, so command behavior was checked against the current official Podman manuals and CRIU documentation rather than local `--help` output.
- The post focuses on local rootful checkpoint/restore, which matches Podman's documented current limitation that checkpointing works with root containers only.
