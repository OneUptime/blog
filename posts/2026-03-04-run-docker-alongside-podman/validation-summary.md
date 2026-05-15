# Validation Summary: How to Run Docker Alongside Podman on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- Docker Engine
- Podman
- systemd
- firewalld
- DNF/RPM package management

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL — https://docs.docker.com/engine/install/rhel/
- Red Hat Documentation: Building, running, and managing containers in RHEL 10 — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Documentation: RHEL 8 Building, running, and managing containers — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/

## Issues Found
- The post is placeholder content rather than a usable RHEL Docker/Podman guide. It uses unresolved placeholders such as `<package-name>`, `/etc/<service>/config.conf`, `<service> --test`, and `firewall-cmd --add-service=<service>`, so the commands cannot be run as written.
- The Docker installation steps do not match Docker's official RHEL instructions, which require setting up Docker's RPM repository with `dnf-plugins-core` and installing concrete packages such as `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`.
- The post does not explain the key Docker/Podman relationship on supported RHEL releases. Red Hat documentation describes Podman as the supported container engine and documents `container-tools` and `podman-docker`; Docker's official RHEL instructions identify `podman` as a package to remove before installing Docker Engine, which is directly relevant to the article's stated topic.
- The `epel-release` dependency is not part of Docker's official RHEL installation path and is not justified by the post.
- The service management, test, logging, firewall, and tuning commands are generic service-template commands, not Docker or Podman commands. Correcting the article would require a substantive rewrite rather than narrow technical fixes.

## Review Notes
The README.md was not edited because the technical problems are not isolated inaccuracies; the article is a generic scaffold that does not provide salvageable, topic-specific implementation guidance within the requested constraint to avoid restructuring or adding new content beyond corrections.
