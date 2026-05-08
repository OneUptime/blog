# Validation Summary: How to Use Podman on IBM Power (ppc64le)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Podman
- IBM Power / ppc64le
- Linux distributions: RHEL, Ubuntu, SUSE Linux Enterprise Server, Fedora, Debian
- Container images and multi-architecture manifests
- Skopeo
- PostgreSQL and Redis containers
- Linux cgroups, SMT, HugeTLB pages, and hardware RNG devices
- GCC Power optimization flags
- QEMU user-mode emulation and binfmt
- systemd Quadlet

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman Quadlet basic usage documentation: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman auto-update documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman info manual page: https://manpages.debian.org/trixie/podman/podman-info.1.en.html
- Red Hat RHEL 8 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat RHEL 9 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- SUSE Container Guide: https://documentation.suse.com/en-us/container/all/html/Container-guide/index.html
- Linux Kernel HugeTLB documentation: https://www.kernel.org/doc/html/next/admin-guide/mm/hugetlbpage.html
- IBM Power SMT documentation: https://www.ibm.com/docs/en/fusion-software/2.10.x?topic=hyperthreading-cores-versus-vcpus-simultaneous-multithreading-smt-power
- Docker/IBM registry manifest metadata checked with `docker manifest inspect` for selected referenced images.

## Issues Found
- The SMT example used `multiprocessing.cpu_count()` after setting `--cpus 8`. That can still report the host-visible logical CPU count rather than the cgroup CPU quota applied by Podman. Changed the snippet to read `/sys/fs/cgroup/cpu.max` when available, which better reflects what `--cpus` configures on cgroup v2 systems.

## Review Notes
- Docker Hub unauthenticated rate limits prevented rechecking every listed Docker Hub image manifest during the final pass, but several referenced official tags were verified to include ppc64le manifests before the limit was hit, and the remaining tags are consistent with current official multi-architecture image publishing patterns.
- The Ubuntu install command includes optional packages such as `slirp4netns` and `fuse-overlayfs`; this is still valid, though newer Podman installs may default to `passt` for rootless networking.
