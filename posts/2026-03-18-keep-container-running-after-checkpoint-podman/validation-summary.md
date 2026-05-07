# Validation Summary: How to Keep the Container Running After Checkpoint in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux container checkpoint/restore
- Bash shell commands
- HAProxy load-balancer draining example

## Sources Consulted
- Podman checkpoint guide: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint` reference: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` reference: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- CRIU memory dumping and restoring documentation: https://criu.org/Memory_dumping_and_restoring
- CRIU memory changes tracking documentation: https://criu.org/Memory_changes_tracking

## Issues Found
- The introduction implied generic container checkpoint support without mentioning Podman's documented root-container limitation and CRIU workload constraints. Updated it to specify root containers and workloads that CRIU can handle.
- The pre-checkpoint example exported only the final incremental checkpoint. For imported restore workflows, Podman documents `--import-previous` for the pre-checkpoint archive plus `--import` for the final archive. Updated the example to export the pre-checkpoint and added the matching restore command.
- The pre-checkpoint comment said there is "no freeze." CRIU documentation describes pre-dump as minimizing freeze time rather than eliminating all pause time. Reworded the comment to avoid that overstatement.
- The conclusion said freeze duration is proportional to memory usage. It also depends on changed pages, storage I/O, CPU, and CRIU/runtime behavior. Reworded the conclusion accordingly.

## Review Notes
- Podman and CRIU checkpoint/restore support has workload-specific limitations; containers using systemd as the entrypoint may not be checkpointable according to Podman documentation.
- The host environment did not have `podman` available for local `--help` verification, so validation relied on current official Podman and CRIU documentation.
