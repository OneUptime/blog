# Validation Summary: How to Checkpoint a Container Without Stopping It in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux containers
- Container checkpoint and restore
- Bash scripting

## Sources Consulted
- Podman `podman container checkpoint` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman container restore` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- CRIU Advanced usage documentation: https://criu.org/Advanced_usage
- CRIU Freezing the tree documentation: https://criu.org/Freezing_the_tree
- CRIU Memory dumping and restoring documentation: https://criu.org/Memory_dumping_and_restoring
- CRIU Statistics documentation: https://criu.org/index.php?title=Statistics

## Issues Found
- The post stated that Podman/CRIU freezes containers specifically via the freezer cgroup. CRIU documents both ptrace capture and freezer cgroup freezing, so the internal sequence was updated to avoid implying a single mechanism.
- The resume step said Podman thaws the freezer cgroup. This was generalized to Podman telling the runtime to resume processes because the freezer mechanism is implementation-dependent.
- The memory overhead section said CRIU reads memory pages from `/proc/[pid]/mem`. CRIU documents use of `/proc/[pid]/smaps`, `/proc/[pid]/map_files`, `/proc/[pid]/pagemap`, and ptrace/vmsplice-based page extraction, so the description was corrected.
- The performance section implied CPU cache state resumes with the process. CPU cache contents are not guaranteed process state, so this was changed to say there is no application startup warmup while cache preservation is not guaranteed.
- The TCP limitation originally implied established TCP connection state is always part of the checkpoint. Podman does not checkpoint established TCP connections by default; the text now notes that `--tcp-established` is required during checkpoint and restore if those connections must be included, and that leave-running checkpoints can make TCP state inconsistent by restore time.

## Review Notes
The CLI examples use current Podman options (`--leave-running`, `--export`, `--import`, and `--name`) and are consistent with the official Podman documentation. For future improvement, the post could mention optional flags such as `--print-stats` for measuring freeze time directly and `--compress=none` for faster archive creation, but those are enhancements rather than correctness fixes.
