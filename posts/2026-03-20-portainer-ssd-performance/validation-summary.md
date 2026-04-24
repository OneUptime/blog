# Validation Summary: How to Configure Portainer SSD Requirements for Best Performance

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- Docker Compose
- Linux block storage and I/O schedulers
- ext4 filesystem
- fio
- BoltDB / bbolt

## Sources Consulted
- Portainer CE install on Docker/Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer database documentation (BoltDB): https://docs.portainer.io/advanced/db-encryption
- Portainer API access tokens: https://docs.portainer.io/2.21/api/access
- Portainer API JWT authorization examples: https://docs.portainer.io/admin/environments/add/api
- Docker daemon configuration and `data-root`: https://docs.docker.com/engine/daemon/
- Docker OverlayFS / `overlay2` storage driver docs: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker storage driver selection and Docker Engine 29 defaults: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker deprecated features (`overlay2.override_kernel_check` removal): https://docs.docker.com/engine/deprecated/
- Docker containerd image store docs: https://docs.docker.com/engine/storage/containerd/
- Linux kernel block scheduler docs: https://docs.kernel.org/6.2/block/switching-sched.html
- Linux kernel ext4 documentation: https://docs.kernel.org/6.18/admin-guide/ext4.html
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html
- bbolt package documentation and performance notes: https://pkg.go.dev/go.etcd.io/bbolt

## Issues Found
1. **Incorrect `docker inspect` template for locating Portainer data.** The original command printed every mount with no separator, but the sample output showed only the `/data` mount. Updated the template to filter specifically for the `/data` destination so the output matches the example.
2. **Invalid Portainer CLI flag value.** The post used `--snapshot-interval=300`, but Portainer documents this flag as a Go duration string such as `30s`, `5m`, or `1h`. Changed it to `--snapshot-interval=5m`.
3. **Non-existent / misleading Portainer environment variable.** The Compose example included `PORTAINER_DATA=/data` and claimed it prevented buffered writes and ensured durability. Portainer documents the data path via `/data` and the `--data` flag, not a `PORTAINER_DATA` env var. Removed the env block and the incorrect durability comment.
4. **Unsafe ext4 mount recommendation.** The post recommended `data=writeback` for the SSD mount. The kernel ext4 docs state that `data=writeback` does not preserve data ordering and can expose stale or inconsistent file contents after a crash. Removed `data=writeback` from both the mount command and `/etc/fstab` example.
5. **Removed Docker daemon option.** The snippet used `overlay2.override_kernel_check=true`, but Docker documents that this option was deprecated in 19.03 and removed in 24.0. Removed it from `daemon.json`.
6. **Docker backend change mixed into a storage relocation step.** The original `daemon.json` forced `"storage-driver": "overlay2"`. On fresh Docker Engine 29+ installs, Docker defaults to the containerd image store, so forcing `overlay2` changes storage backend rather than just relocating data. Simplified the snippet to only set `data-root` and added a note about `/etc/containerd/config.toml` for containerd-backed installs.
7. **Invalid JSON example.** The `daemon.json` block included a `//` comment line inside a `json` snippet, which would make the file invalid if copied literally. Moved the file-path label outside the JSON block.
8. **Broken root redirection for the udev rule.** `cat > /etc/udev/rules.d/...` would fail for non-root users even with surrounding sudo elsewhere. Replaced it with `sudo tee ... << 'EOF'` so the rule file can actually be written.
9. **Unsupported read-ahead tuning advice.** The post instructed readers to set block-device readahead to `0` for SSDs. I found no authoritative Docker, Portainer, or kernel guidance supporting that blanket recommendation, and Linux readahead is still relevant for buffered and sequential reads. Removed the command.
10. **Benchmark commands missing required privilege / I/O settings.** The direct-write `dd` test under `/var/lib/docker` needed `sudo`, and the `fio` random-write test used `iodepth=32` without an async/direct setup even though fio documents that `iodepth > 1` does not affect synchronous engines. Added `sudo` to the `dd` test and added `--ioengine=libaio --direct=1` to the fio examples.
11. **Overstated performance claims.** The conclusion claimed a typical `50-80%` API response improvement and described certain scheduler choices as universally optimal. Those claims were not supported by the docs I checked. Softened the wording to keep the guidance accurate and workload-dependent.
12. **Portainer image tag not aligned with current install docs.** The Compose example used `portainer/portainer-ce:latest`, while Portainer's current install docs use `:lts` for CE. Updated the example to `portainer/portainer-ce:lts`.

## Review Notes
- Docker Engine 29+ fresh installs default to the containerd image store. The post now notes that changing Docker's `data-root` does not also relocate `/var/lib/containerd`; that path is configured separately in `/etc/containerd/config.toml`.
- The API benchmark still uses `Authorization: Bearer $TOKEN`, which is valid when `$TOKEN` is a JWT obtained from `/api/auth`. If a reader uses a Portainer user access token instead, the header should be `X-API-Key`.
- The Compose `version: "3.8"` key is legacy/optional in modern Docker Compose, but it remains widely accepted and does not break the example as written.
