# Validation Summary: How to Choose Between Podman and LXC/LXD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- LXC
- LXD
- OCI container images
- Linux system containers
- CRIU checkpoint and restore
- LXD networking, storage, snapshots, and migration
- Linux container security features including namespaces, AppArmor, seccomp, and capabilities

## Sources Consulted
- Podman run/create documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman checkpoint documentation: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman restore documentation: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman volume create documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- LXD overview documentation: https://documentation.ubuntu.com/lxd/latest/
- LXD containers and VMs documentation: https://documentation.ubuntu.com/lxd/latest/explanation/instances/
- LXD container runtime environment documentation: https://documentation.ubuntu.com/lxd/latest/container-environment/
- LXD first steps and instance configuration documentation: https://documentation.ubuntu.com/lxd/latest/tutorial/first_steps/
- LXD instance config CLI documentation: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/config/set/
- LXD device config CLI documentation: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/config/device/set/
- LXD proxy device documentation: https://documentation.ubuntu.com/lxd/en/stable-5.0/reference/devices_proxy/
- LXD storage documentation: https://documentation.ubuntu.com/lxd/latest/explanation/storage/
- LXD storage CLI documentation: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/storage/create/
- LXD snapshot restore CLI documentation: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/restore/
- LXD instance move documentation: https://documentation.ubuntu.com/lxd/stable-5.0/howto/move_instances/
- LXD security documentation: https://documentation.ubuntu.com/lxd/stable-5.21/explanation/security/
- LXD user namespace idmap documentation: https://documentation.ubuntu.com/lxd/latest/userns-idmap/

## Issues Found
- The post described `lxc move` as "live migration between hosts." Current LXD documentation says normal container moves generally require stopping the container, while live migration is fully supported for virtual machines and only has limited support for containers. Changed the wording to "instance migration" and "Move an instance between hosts."
- The LXD examples used the older space-separated form for `lxc config set` and `lxc config device set`. Current LXD CLI documentation shows `key=value` syntax, while the old form is retained for backward compatibility. Updated the examples to the current documented syntax.

## Review Notes
The post is technically relevant and the remaining Podman and LXD examples are consistent with the official documentation checked. Some examples assume a configured LXD installation, available image remotes, and host support for features such as ZFS, CRIU checkpointing, and unprivileged container settings.
