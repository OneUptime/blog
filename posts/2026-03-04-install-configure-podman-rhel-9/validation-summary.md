# Validation Summary: How to Install and Configure Podman on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Buildah
- Skopeo
- container-tools
- containers.conf
- registries.conf
- storage.conf
- systemd user sockets
- firewalld

## Sources Consulted
- Red Hat Documentation: Building, running, and managing containers on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Documentation: Working with container registries on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers
- Red Hat Documentation: Considerations in adopting RHEL 9, Containers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_containers_considerations-in-adopting-rhel-9
- Podman documentation: What is Podman? - https://docs.podman.io/en/v4.6.1/
- Podman documentation: podman-login(1) - https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- Podman documentation: podman-system-service(1) - https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- containers-storage.conf(5) manual page - https://manpages.debian.org/experimental/containers-storage/containers-storage.conf.5.5.en.html
- containers.conf(5) manual page - https://manpages.debian.org/experimental/golang-github-containers-common/containers.conf.5.en.html

## Issues Found
- The post said each container runs as a child process of the Podman command. This was too imprecise because Podman is daemonless but starts containers through the OCI runtime and `conmon`; the long-running container is not simply a child of a persistent Podman CLI process. Updated the explanation.
- The registry section said RHEL defaults only include `registry.redhat.io` and `registry.access.redhat.com`, then framed `docker.io` as something to add. Red Hat's RHEL 9 documentation shows `registry.access.redhat.com`, `registry.redhat.io`, and `docker.io` in the unqualified search list. Updated the default registry wording and changed the instruction to verifying or customizing the order.
- The registry authentication section stated a root-specific auth path. Podman's documented Linux default is `${XDG_RUNTIME_DIR}/containers/auth.json`, and the docs note this location is under `/run` and does not persist across reboot. Updated the text and added the documented persistent `--authfile ~/.config/containers/auth.json` example.
- The rootless verification commands used unanchored `grep $USER`, which can match substrings and is less reliable. Updated them to match the username field with `grep "^${USER}:"`.
- The post described `podman system migrate` as resetting storage after subordinate ID changes. The command migrates Podman state so new mappings can be picked up; updated the wording.

## Review Notes
Podman was not installed in the local review environment, so CLI checks against local `--help` output could not be performed. Commands and configuration fields were verified against Red Hat and Podman documentation instead.
