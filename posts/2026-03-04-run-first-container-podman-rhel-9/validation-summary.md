# Validation Summary: How to Run Your First Container with Podman on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Linux containers
- Red Hat Universal Base Image
- Docker Hub images for nginx and MariaDB
- systemd and Quadlet

## Sources Consulted
- Red Hat Enterprise Linux 9: Building, running, and managing containers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Enterprise Linux 9: Working with container registries: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers
- Red Hat Enterprise Linux 9: Managing a container network: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_managing-a-container-network_building-running-and-managing-containers
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman stop documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman logs documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman exec documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman cp documentation: https://docs.podman.io/en/latest/markdown/podman-cp.1.html
- Podman image prune documentation: https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html
- Podman system prune documentation: https://docs.podman.io/en/latest/markdown/podman-system-prune.1.html
- MariaDB Server Docker Official Image environment variables: https://mariadb.com/kb/en/mariadb-server-docker-official-image-environment-variables/

## Issues Found
- The post said `podman image prune` removes all unused images. Podman only removes dangling images by default; `-a` is required for all unused images. Changed the command to `podman image prune -a`.
- The post described `podman system prune -a` as removing containers, images, and volumes. Podman does not prune volumes by default; `--volumes` is required. Changed the command to `podman system prune -a --volumes` and clarified that it removes unused resources.
- The post said `--restart` policies require the Podman service to be running. Podman is daemonless; reboot restart behavior depends on the `podman-restart.service` systemd unit. Updated the note accordingly.

## Review Notes
- Podman was not installed in the review environment, so command behavior was verified against official Podman and Red Hat documentation rather than local `podman --help` output.
- The `podman inspect --format '{{.NetworkSettings.IPAddress}}'` example matches Red Hat documentation for RHEL 9. In rootless networking, Red Hat documents that containers do not have a container IP address, so readers running rootless may see an empty value.
