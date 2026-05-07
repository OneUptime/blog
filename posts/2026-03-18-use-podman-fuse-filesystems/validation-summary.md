# Validation Summary: How to Use Podman with FUSE Filesystems

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- FUSE
- fuse-overlayfs
- SSHFS
- s3fs
- GlusterFS
- gocryptfs
- Python
- Linux container storage

## Sources Consulted
- Podman performance guide: https://raw.githubusercontent.com/containers/podman/main/docs/tutorials/performance.md
- Podman run reference: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman troubleshooting guide: https://raw.githubusercontent.com/containers/podman/main/troubleshooting.md
- containers-storage.conf reference: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md
- Fedora `fuse-sshfs` package page: https://packages.fedoraproject.org/pkgs/fuse-sshfs/fuse-sshfs/
- SSHFS upstream manual: https://raw.githubusercontent.com/libfuse/sshfs/master/sshfs.rst
- s3fs upstream documentation: https://github.com/s3fs-fuse/s3fs-fuse
- Gluster client setup documentation: https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Clients/
- gocryptfs manpage: https://raw.githubusercontent.com/rfjakob/gocryptfs/master/Documentation/MANPAGE.md

## Issues Found
- The post stated that rootless Podman relies on `fuse-overlayfs` because it cannot use the kernel overlay driver. This is outdated on modern kernels. I corrected the explanation to reflect current Podman behavior: rootless Podman can use native overlayfs on supported systems and uses `fuse-overlayfs` when native rootless overlay is unavailable.
- The post used `podman info --format '{{.Store.GraphOptions}}'` to infer whether rootless `overlay` was backed by `fuse-overlayfs`. That is not the reliable check. I changed it to `podman info --format '{{index .Store.GraphStatus "Native Overlay Diff"}}'`, which Podman documents for distinguishing native overlay from `fuse-overlayfs`.
- The verification step after editing `storage.conf` only checked `GraphDriverName`, which stays `overlay` for both native overlayfs and `fuse-overlayfs`. I added the `Native Overlay Diff` check so the example verifies the actual storage mode.
- The article's `/dev/fuse` guidance was incomplete for common SELinux/rootless cases. I added the documented SELinux note (`container_use_devices=true` or `--security-opt label=disable`) and clarified the rootless supplemental-group case with `--group-add keep-groups`.
- The Fedora SSHFS example installed `sshfs`, but Fedora packages the client as `fuse-sshfs`. I fixed the package name.
- The S3FS example forced `-o url=https://s3.amazonaws.com` even though the example is for Amazon S3. I removed that option so the command matches the upstream AWS-oriented usage more closely.
- The Python benchmark script only printed `GraphDriverName`, which cannot distinguish native overlayfs from `fuse-overlayfs`. I updated it to print `Native Overlay Diff` when the driver is `overlay`.
- The Python benchmark script used `echo "FROM alpine\nRUN echo hello"` for the inline Containerfile, which is shell-dependent and commonly wrong because `\n` is not reliably expanded. I replaced it with `printf`, which produces a valid multi-line Containerfile.
- The capability-dropping best-practices example redundantly added `SYS_ADMIN` twice. I simplified it to `--cap-drop ALL --cap-add SYS_ADMIN`.

## Review Notes
- Rootless native overlayfs availability is version- and kernel-dependent. Current Podman documentation says native rootless overlayfs is available with Podman 3.1+ on Linux 5.13+, or 5.11+ when SELinux is not in use.
- FUSE mounts inside containers can still require host-specific security adjustments even when the container command is otherwise correct, especially on SELinux systems and on rootless setups where `/dev/fuse` access comes from a supplemental group.
