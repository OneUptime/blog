# Validation Summary: How to Set Up Docker with Btrfs Storage Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker storage drivers
- Btrfs filesystem
- Linux filesystem administration
- systemd service management
- `/etc/fstab` mount configuration

## Sources Consulted
- Docker Docs: BTRFS storage driver - https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: containerd image store with Docker Engine - https://docs.docker.com/engine/storage/containerd/
- Docker Docs: dockerd CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Btrfs documentation: btrfs(5) manual page - https://btrfs.readthedocs.io/en/latest/btrfs-man5.html
- Btrfs documentation: btrfs-property(8) manual page - https://btrfs.readthedocs.io/en/latest/btrfs-property.html
- Btrfs documentation: Balance - https://btrfs.readthedocs.io/en/stable/Balance.html
- Linux kernel documentation: BTRFS - https://www.kernel.org/doc/html/latest/filesystems/btrfs.html
- Btrfs documentation: Contributors / merge history - https://btrfs.readthedocs.io/en/latest/Contributors.html
- Debian package information: btrfs-compsize - https://packages.debian.org/bookworm/btrfs-compsize

## Issues Found
- The post said each Docker image and container layer gets its own Btrfs subvolume. Docker's Btrfs documentation is more precise: the base image layer is a true subvolume, while child image layers and containers are snapshots, which appear as subvolumes on disk. Updated the introduction, feature bullet, and workflow explanation.
- The post claimed Btrfs can offer better performance for workloads with many small writes, particularly databases. Docker's Btrfs performance guidance warns that lots of small writes can cause poor chunk usage, fragmentation, and out-of-space conditions, and recommends Docker volumes for write-heavy workloads. Updated the comparison text to avoid recommending Btrfs for database-heavy writable layers.
- The prerequisites listed broad Linux distributions with Btrfs support, but Docker's current documentation limits/recommends the classic `btrfs` storage driver to specific Docker Engine CE environments such as Ubuntu, Debian, and SLES. Updated the prerequisite to reflect Docker support rather than generic filesystem support.
- The post did not mention that Docker Engine 29.0 and later fresh installs default to the containerd image store, where classic storage driver guidance does not directly apply. Added a short caveat in the configuration section.
- The compression command was described as enabling compression for the whole Docker filesystem. `btrfs property set` sets an inode compression property, while filesystem-wide compression is configured with a mount option. Updated the wording to distinguish directory-level property usage from filesystem-wide mount configuration.
- The post said a new writable Btrfs snapshot consumes zero additional space. Snapshots consume little additional data space initially, but not literally zero overall. Updated the statement to avoid overprecision.
- The compression statistics comment implied `btrfs filesystem df` shows compression ratio. It shows Btrfs allocation/usage, while `compsize` reports compression details. Updated the command comment.
- The autodefrag example mounted with only `autodefrag`, dropping the earlier `ssd` and `compress=zstd` options. Updated the example to preserve the other shown mount options and describe autodefrag as something to test.

## Review Notes
The remaining commands and configuration snippets are syntactically plausible and match current Docker and Btrfs documentation for the classic Docker storage-driver backend. The post could be improved in the future by adding explicit migration steps for Docker Engine 29+ hosts using the containerd image store, but that would be a larger scope change than a technical correction.
