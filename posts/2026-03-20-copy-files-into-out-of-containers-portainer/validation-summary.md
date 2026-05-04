# Validation Summary: How to Copy Files Into and Out of Containers in Portainer - Into Out

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (Community & Business Edition)
- Docker (`docker cp`, `docker exec`)
- Docker volumes (named volumes, host filesystem layout)
- Bash / coreutils (`cp`, `cat`, `echo`, `base64`)

## Sources Consulted
- Portainer container documentation: https://docs.portainer.io/user/docker/containers
- Portainer container console docs: https://docs.portainer.io/user/docker/containers/console
- Portainer volume browser docs: https://docs.portainer.io/user/docker/volumes/browse
- Portainer GitHub issue requesting host filesystem browsing: https://github.com/portainer/portainer/issues/2182
- Docker `docker cp` reference: https://docs.docker.com/reference/cli/docker/container/cp/
- Docker `docker exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker volumes reference (default storage at `/var/lib/docker/volumes/`): https://docs.docker.com/engine/storage/volumes/
- GNU coreutils `cp` documentation (recursive `-r` requirement): https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html

## Issues Found
1. **Method 1 described a non-existent "Files" tab.** The original post claimed Portainer has a per-container "Files" tab available when the container is running, providing a read-only filesystem browser. This is inaccurate — Portainer's container view exposes only Logs, Inspect, Stats, Console, and Attach (no Files tab). The actual GUI feature for browsing files is the **Volume Browser** (Volumes > Browse), which operates on named volumes rather than the container's writable layer, and which requires the Portainer Agent or a Docker Swarm deployment. I rewrote Method 1 to describe the Volume Browser correctly, and updated the corresponding rows in the Use Cases table and the Summary section to match.

2. **`cp` commands in Method 4 missing `-r` for directory copies.** The lines `cp /var/lib/docker/volumes/webapp-data/_data/uploads ./uploads-backup` and `cp ./uploads-restore/* /var/lib/docker/volumes/webapp-data/_data/uploads/` would fail to recurse into subdirectories (and the first would error out with "omitting directory" since `uploads` is a directory). I added the `-r` flag to both invocations.

## Review Notes
- `docker cp` syntax, examples, and use cases match the official Docker CLI reference, including the host-to-container and container-to-host directions and directory copies with trailing slashes.
- The default named-volume path `/var/lib/docker/volumes/<volume-name>/_data/` is correct for default Docker installations on Linux. On systems with a non-default `data-root` or with a userns-remap configuration the path differs, but the post's caveat-free statement is accurate for standard setups.
- The `base64 /app/config.json` exfiltration trick works on Linux GNU coreutils. On macOS BSD `base64`, it also works (the `-i` flag is optional for input file). No change needed.
- Worth noting for future revisions: directly editing `/var/lib/docker/volumes/...` while the container is running is generally safe for read access but can race with writes. The post already advises stopping the container for backup operations, which is the safer pattern.
- The Volume Browser feature requires the Portainer Agent or Docker Swarm; readers using a plain local Docker endpoint will not see the Browse button. The corrected Method 1 now mentions this limitation.
