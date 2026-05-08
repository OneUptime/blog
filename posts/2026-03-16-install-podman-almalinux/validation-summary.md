# Validation Summary: How to Install Podman on AlmaLinux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AlmaLinux 8 and 9
- Podman
- Buildah
- Skopeo
- Rootless containers
- SELinux container labeling
- systemd user services and Podman sockets
- firewalld
- EPEL and podman-compose

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman rootless mode documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman generate systemd documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman SELinux volume option documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Red Hat RHEL 8 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat RHEL 9 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Container Tools AppStream lifecycle policy: https://access.redhat.com/support/policy/updates/containertools
- AlmaLinux EPEL repository documentation: https://wiki.almalinux.org/repos/Extras
- Fedora package information for podman-compose in EPEL: https://packages.fedoraproject.org/pkgs/podman-compose/podman-compose/
- firewalld command documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The "Full Container Toolkit" heading overstated the command, which installs Buildah and Skopeo but not the complete `container-tools` meta-package. Changed the heading to "Install Additional Container Tools."
- The practical example said nginx was an application that connects to Redis. The shown nginx container does not connect to Redis; it only shares the custom Podman network. Updated the comment to describe it as a web frontend on the same network and clarified that the `ping` command checks name resolution.
- The SELinux troubleshooting block used `audit2allow` without ensuring the package that provides it is installed. Added `sudo dnf install -y policycoreutils-python-utils` before generating a local policy.
- The practical example called the two-container nginx and Redis setup a multi-container application, but the containers were not configured as one application. Reworded it as two containers on a custom network.
- The AlmaLinux 8 module troubleshooting text described switching to a newer stream, but `container-tools:rhel8` is the supported rolling stream rather than a named newer stable stream. Updated the text to describe switching an older stream to the supported rolling stream.

## Review Notes
The use of `podman generate systemd` is technically valid but deprecated; the post already notes that Quadlet `.container` files are preferred for new deployments. Podman was not installed in the local review environment, so command behavior was verified against official Podman and Red Hat documentation instead of local execution.
