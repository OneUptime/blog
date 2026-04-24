# Validation Summary: How to Fix Portainer Data Volume Permission Issues - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Engine
- Docker named volumes
- Docker bind mounts
- SELinux
- AppArmor
- NFS

## Sources Consulted
- Portainer Documentation, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Documentation, "My host is using SELinux. Can I use Portainer?": https://docs.portainer.io/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Docker Docs, "Bind mounts": https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs, "Volumes": https://docs.docker.com/engine/storage/volumes/
- Docker Docs, "AppArmor security profiles for Docker": https://docs.docker.com/engine/security/apparmor/
- Docker Docs, "`docker container run` reference": https://docs.docker.com/reference/cli/docker/container/run
- Ubuntu Manpage, "`aa-complain(8)`": https://manpages.ubuntu.com/manpages/jammy/man8/aa-complain.8.html
- Portainer source Dockerfile: https://github.com/portainer/portainer/blob/develop/build/linux/Dockerfile
- Red Hat Documentation, "Configuring the NFS Server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/nfs-serverconfig
- Red Hat Documentation, "Do Not Use the no_root_squash Option": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/security_guide/sect-security_guide-securing_nfs-do_not_use_the_no_root_squash_option

## Issues Found
- The SELinux section incorrectly used `:z`/`:Z` on a named Docker volume and omitted Portainer's documented requirement to run Portainer with `--privileged` when managing a local Docker environment on an SELinux-enabled host. I replaced those examples so `--privileged` is used for Portainer, and kept `:Z` only on bind-mounted host directories where Docker documents SELinux relabeling.
- The AppArmor section treated `/etc/apparmor.d/docker` as Docker's default container profile and used `aa-complain` against it. Docker's official docs state the default container profile is `docker-default`, generated in `tmpfs`, and the Ubuntu `aa-complain` utility is meant to switch installed profiles into complain mode. I replaced that section with accurate `docker-default` checks and a custom-profile workflow using `apparmor_parser` and `--security-opt apparmor=...`.
- The NFS guidance recommended `no_root_squash` as a fix. Red Hat's documentation explicitly warns against using `no_root_squash` broadly. I changed the recommendation to checking `root_squash`, `anonuid`, and `anongid` handling instead.
- Several Portainer run commands used floating `:latest` tags. I updated them to the current documented `portainer/portainer-ce:sts` channel used in Portainer's current install docs.
- The bind-mount-to-volume migration example copied data with `cp -a` but did not correct ownership afterward, which could preserve the original bad UID/GID metadata and reproduce the same failure. I added an ownership fix after migration and made the final restart examples consistent.

## Review Notes
- The guide assumes a standard rootful Docker Engine deployment. Portainer's install docs note that rootless Docker has limitations and may require additional configuration.
- Portainer's current install docs treat `9443` as the default UI port and `9000` as legacy HTTP compatibility. The post still exposes `9000` intentionally, which is valid, but `9443` remains the primary documented port.
