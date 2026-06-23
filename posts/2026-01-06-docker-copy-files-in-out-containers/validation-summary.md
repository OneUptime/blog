# Validation Summary: How to Copy Files In and Out of Running Docker Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (`docker cp`, `docker run`, `docker exec`, `docker create`, `docker volume`)
- Docker bind mounts and named volumes
- Docker Compose (volumes configuration)
- tar (used for streaming/permission/symlink handling)

## Sources Consulted
- Docker CLI reference - `docker cp`: https://docs.docker.com/reference/cli/docker/container/cp/
- Docker storage / volumes and bind mounts documentation: https://docs.docker.com/engine/storage/

## Issues Found
1. **Incorrect symlink default behavior (Gotcha: Symlinks).** The post claimed "`docker cp` follows symlinks by default." This is wrong. Per the official Docker CLI reference, "If `SRC_PATH` is local and is a symbolic link, the symbolic link, not the target, is copied by default" — i.e. `docker cp` preserves symlinks by default, and the `-L`/`--follow-link` flag must be passed to follow them.
   - The accompanying example also contradicted its own stated goal: it claimed to "preserve symlinks" but used `tar -chf` where the `-h` flag *follows* symlinks (copies targets) rather than preserving the links.
   - **Fix:** Rewrote the gotcha to state that `docker cp` preserves symlinks by default and that `-L` is needed to follow them. Replaced the contradictory example with a correct `docker cp -L` example and clarified that tar's `-h` follows symlinks (consistent with the corrected explanation).

## Review Notes
- The `-a`/`--archive` flag claim is correct: `docker cp --archive` copies UID/GID information (sets ownership to the user/group at the source). Verified against the CLI reference.
- `docker cp` working on stopped/never-started containers (including those made with `docker create`) is accurate.
- The tar-pipe streaming examples using `-` as source/destination are valid: `docker cp container:src -` streams a tar archive to STDOUT, and `docker cp - container:dst` reads a tar archive from STDIN.
- Minor imprecision (not changed, not strictly incorrect): the comment "Docker cp doesn't always preserve permissions; tar does." `docker cp` does preserve file mode bits via its tar stream; what it does not preserve by default is ownership (UID/GID), which `--archive` addresses. The phrasing is loose but not a hard error.
- Volume mount, named volume, backup/restore helper-container, and Docker Compose examples are all syntactically and behaviorally correct for current Docker versions.
