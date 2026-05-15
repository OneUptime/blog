# Validation Summary: How to Manage Podman Containers Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit web console
- cockpit-podman
- Podman containers, images, pods, volumes, and registries
- SELinux container volume labels
- systemd and Podman Quadlet

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing containers by using the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/managing-containers-by-using-the-rhel-web-console
- Red Hat Enterprise Linux 9 documentation: Working with container registries: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers
- Podman documentation: podman-generate-systemd: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman documentation: podman-systemd.unit / Quadlet: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman documentation: podman-run volume and SELinux labeling options: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman documentation: podman-pod-create port publishing: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman documentation: podman-stats: https://docs.podman.io/en/latest/markdown/podman-stats.1.html

## Issues Found
- The installation section installed `cockpit-podman` but did not enable the Cockpit web console service. Added `sudo systemctl enable --now cockpit.socket`, matching the RHEL web console prerequisite that Cockpit must be enabled.
- The systemd section used `podman generate systemd`, which current Podman documentation marks as deprecated in favor of Quadlet. Replaced the example with a `.container` Quadlet file and `systemctl enable --now my-nginx.service`.
- The rootless systemd note pointed to `~/.config/systemd/user/`, which is the location for generated/user systemd unit files rather than rootless Quadlet files. Updated it to `~/.config/containers/systemd/` and added `loginctl enable-linger` for boot-starting rootless user services.

## Review Notes
The remaining Podman CLI examples, Cockpit workflow descriptions, SELinux `:Z` volume labeling guidance, pod port mapping example, image registry configuration example, and lifecycle commands were consistent with the official documentation consulted. Podman was not installed in the review workspace, so CLI behavior was verified against official documentation rather than local `--help` output.
