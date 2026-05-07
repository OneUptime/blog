# Validation Summary: How to Use Podman on CentOS Stream 9

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- CentOS Stream 9
- DNF
- Buildah
- Skopeo
- SELinux
- systemd Quadlet
- firewalld
- Container networking
- Container health checks

## Sources Consulted
- Podman `podman-systemd.unit(5)`: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-auto-update(1)`: https://docs.podman.io/en/v5.2.3/markdown/podman-auto-update.1.html
- Podman `podman-run(1)`: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `podman-search(1)`: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman `podman(1)` rootless mode documentation: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- Podman `podman-network-create(1)`: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Red Hat Enterprise Linux 9, Building, running, and managing containers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/enabling-the-podman-api-using-systemd-in-rootless-mode_using-the-container-tools-api
- Red Hat Enterprise Linux 9.0 Release Notes, Application Streams: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/9.0_release_notes/application_streams

## Issues Found
- The Quadlet example used `AutoUpdate=registry` with `Image=myapp:latest`. I changed it to `AutoUpdate=local` because Podman requires a fully qualified registry image for the `registry` auto-update policy, while the post builds a local image earlier in the guide.
- The activation steps used `sudo systemctl enable --now app.service`. I changed this to `sudo systemctl start app.service` because Quadlet-generated services are transient and Podman documents that they should not be enabled with `systemctl enable`; the `[Install]` section is applied by the generator.
- The service log command omitted `sudo` even though the example uses a system Quadlet in `/etc/containers/systemd`. I changed `journalctl -u app.service -f` to `sudo journalctl -u app.service -f` so it matches the root-level systemd workflow shown in that section.

## Review Notes
- The `sealert` example is technically correct, but it depends on `setroubleshoot-server`, which is not installed on every minimal CentOS Stream 9 system.
