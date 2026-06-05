# Validation Summary: How to Compare Docker Storage Driver Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker storage drivers
- overlay2 / OverlayFS
- btrfs
- zfs
- devicemapper
- vfs
- fio benchmarking
- Linux filesystems and disk usage tools

## Sources Consulted
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: BTRFS storage driver - https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker Docs: ZFS storage driver - https://docs.docker.com/engine/storage/drivers/zfs-driver/
- Docker Docs: Device Mapper storage driver (deprecated) - https://docs.docker.com/engine/storage/drivers/device-mapper-driver/
- Docker Docs: VFS storage driver - https://docs.docker.com/engine/storage/drivers/vfs-driver/
- Docker CLI local help output for `docker info`, `docker run`, `docker create`, `docker start`, and `docker image inspect`.
- GNU coreutils local help output for `df --output`.

## Issues Found
- The introduction described overlay2 as the default without the current Docker Engine 29.0+ caveat. Updated it to clarify that overlay2 is the default for classic storage drivers on most supported Linux distributions, while fresh Docker Engine 29.0+ installations use the containerd image store by default.
- The storage-driver table listed overlay2 backing filesystems too narrowly and omitted the xfs `ftype=1` requirement. Updated the row to match Docker's supported backing filesystem guidance.
- The devicemapper row did not mention that the driver is deprecated and described its storage too loosely. Updated it to dedicated block devices/direct-lvm and marked it deprecated.
- The `docker info --format '{{json .Driver}}'` command was labeled as detailed storage information, but it only prints the driver name. Replaced it with `{{json .DriverStatus}}`.
- The pull benchmark wrote millisecond values while the CSV header said `time_seconds`. Changed the header to `time_ms`.
- The sequential-read benchmark attempted to drop caches inside an unprivileged container and ignored failure, which made the read benchmark likely to use cached data. Added `--privileged`, `sync`, and made the cache-drop command explicit.
- The results and driver-choice sections treated btrfs compression and ZFS compression/deduplication as automatic benefits. Updated the wording to make those optional features clear.
- The ZFS recommendation was too broad for production use. Updated it to recommend ZFS when the team has ZFS experience, matching Docker's caveat.
- The btrfs recommendation claimed higher CPU usage due to block-level CoW without support from the consulted Docker docs. Replaced it with Docker's documented memory and maintenance caveats.

## Review Notes
The benchmark scripts are suitable as illustrative examples, but real comparisons should still isolate network pull time, account for filesystem mount options, and prefer Docker volumes for write-heavy application data. The article now reflects Docker's current distinction between classic storage drivers and the Docker Engine 29.0+ containerd image store.
