# Validation Summary: How to Build a Minimal Photon OS 5 Docker Host from the ISO

## Status

validated

## Post Type

Tutorial / installation and operational verification guide.

## Technologies Covered

- Photon OS 5 minimal installation and VMware-optimized kernel
- VMware vSphere / ESXi, ISO media, VMDK storage, port groups, and VLANs
- TDNF, RPM, and Photon package repositories
- Linux storage and network diagnostics, systemd service management
- Docker Engine, container image references, published ports, and firewall behavior
- Nginx Docker Official Image

## Sources Consulted

- [Photon OS download catalog](https://github.com/vmware/photon/wiki/Downloading-Photon-OS), retrieved through its [raw wiki source](https://raw.githubusercontent.com/wiki/vmware/photon/Downloading-Photon-OS.md): Photon 5 ISO architectures, minimal images, and published SHA-512 checksums.
- [Photon OS 5 ISO installation on vSphere](https://vmware.github.io/photon/docs-v5/installation-guide/run-photon-on-vsphere/installing-photon-os-from-iso-image-on-vsphere/): datastore attachment, boot media, partitioning, minimal profile, network setup, kernel selection, and root login.
- [Photon repository location migration](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon), retrieved through its [raw wiki source](https://raw.githubusercontent.com/wiki/vmware/photon/changes-to-repository-location-in-photon.md): migration from packages.vmware.com to packages-prod.broadcom.com using updated photon-repos packages.
- [Photon OS 5 TDNF commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/): repository listing, update checking, updates, and package installation.
- [Photon OS 5 Docker containers](https://vmware.github.io/photon/docs-v5/administration-guide/containers/docker-containers/): Docker availability, service startup, and docker info.
- [Upstream systemctl manual source](https://raw.githubusercontent.com/systemd/systemd/main/man/systemctl.xml): failed-unit listing, service status, enable --now, and pager control.
- [GNU Coreutils manual source](https://raw.githubusercontent.com/coreutils/coreutils/master/doc/coreutils.texi): cat, uname -r, and df -h.
- [util-linux lsblk manual](https://man7.org/linux/man-pages/man8/lsblk.8.html): filesystem information with -f.
- [Upstream iproute2 ip manual](https://raw.githubusercontent.com/iproute2/iproute2/main/man/man8/ip.8): address and route objects and the -br option.
- [RPM query mode](https://ftp.rpm.org/max-rpm/s1-rpm-commands-query-mode.html): querying an installed package by name with rpm -q.
- [Docker run reference](https://docs.docker.com/reference/cli/docker/container/run/): detached execution, naming, image pulling, and host-to-container port mapping.
- [Docker version](https://docs.docker.com/reference/cli/docker/version/) and [Docker info](https://docs.docker.com/reference/cli/docker/system/info/): client/server version reporting and daemon information.
- [Docker logs](https://docs.docker.com/reference/cli/docker/container/logs/), [Docker port](https://docs.docker.com/reference/cli/docker/container/port/), and [Docker rm](https://docs.docker.com/reference/cli/docker/container/rm/): smoke-test inspection and forced cleanup.
- [Nginx Official Image manifest](https://raw.githubusercontent.com/docker-library/official-images/master/library/nginx): stable tag and supported architectures.
- [Docker Linux post-installation guidance](https://docs.docker.com/engine/install/linux-postinstall/): privileged daemon access, boot startup, and log rotation.
- [Docker packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/): published-port handling and Docker-managed firewall rules.
- [Docker automatic container startup](https://docs.docker.com/engine/containers/start-containers-automatically/): restart policies and the distinction between starting Docker and restarting application containers.

## Issues Found

No technical issues found.

## Review Notes

- The post contains executable commands and version-specific installation details, so it qualifies for technical validation. README.md was left unchanged.
- The documented ISO workflow supports the minimal profile and hypervisor-optimized kernel. The post appropriately leaves exact guest compatibility, firmware, resource sizing, and network settings dependent on the deployment.
- Baseline commands correctly inspect OS identification, the running kernel, block-device filesystems, root filesystem capacity, IP addresses, routes, and failed systemd units. A larger virtual disk alone does not establish that the guest filesystem has grown.
- The TDNF commands are valid interactive commands. The repository migration reference is relevant to older Photon 5 media; the post correctly retains TLS verification. The download catalog itself still contains legacy packages.vmware.com links, so readers may encounter the same hostname transition when obtaining older media. ISO downloads were not attempted.
- Photon documentation describes Docker as already present in the minimal installation. Running tdnf install docker is still valid to ensure its presence; systemctl enable --now docker explicitly enables and starts the service.
- Docker command syntax and flags are correct. The smoke test maps host TCP port 8080 to container port 80. With no host IP specified, normal Docker defaults publish on all host addresses; the post's firewall and network-boundary guidance is therefore relevant.
- The stable tag is mutable, as the article acknowledges. Docker normally pulls a requested image when it is absent locally; repeated tests can reuse an existing image. No fixed Nginx or Docker release is assumed by the examples.
- The temporary smoke-test container has no restart policy and is explicitly removed. The final reboot check applies to the real deployment, whose restart policy or service management must provide application startup; enabling the Docker daemon alone does not restart every container.
- Review consisted of documentation and source-reference checks, plus static inspection of the shell examples. No Photon VM was provisioned, no package transaction or container was executed, and external endpoint access, storage layout, and reboot behavior were not tested on a live host.
