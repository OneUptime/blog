# Validation Summary: How to Install Docker Engine and Docker Compose on Photon OS 5

## Status

validated

## Post Type

Tutorial / installation and verification guide.

## Technologies Covered

- Photon OS 5 and its package repositories.
- tdnf and RPM package management.
- Docker Engine and Docker CLI plugin discovery.
- Docker Compose and YAML service configuration.
- systemd service management and journal diagnostics.
- NGINX containers, published ports, and restart policies.

## Sources Consulted

- [Photon OS 5 tdnf commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/) — package information, repository listing, installation, and updates.
- [Photon repository migration](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) — verified through the [official raw wiki page](https://raw.githubusercontent.com/wiki/vmware/photon/changes-to-repository-location-in-photon.md).
- [Photon 5 Docker package specification](https://github.com/vmware/photon/blob/5.0/SPECS/docker/docker.spec) — Docker client, daemon, and systemd service packaging.
- [Photon 5 Compose package specification](https://github.com/vmware/photon/blob/5.0/SPECS/90/docker-compose/docker-compose.spec) — package name and CLI plugin installation.
- [Docker Compose plugin installation](https://docs.docker.com/compose/install/linux/) — verification command, manual installation locations, architecture selection, and update responsibility.
- [Docker CLI plugin manager source](https://github.com/docker/cli/blob/master/cli-plugins/manager/manager.go) — user plugin precedence over system plugin locations.
- [Compose file reference](https://docs.docker.com/reference/compose-file/) and [service attributes](https://docs.docker.com/reference/compose-file/services/) — services, image references, port syntax, and restart policy.
- Docker Compose command references: [config](https://docs.docker.com/reference/cli/docker/compose/config/), [pull](https://docs.docker.com/reference/cli/docker/compose/pull/), [up](https://docs.docker.com/reference/cli/docker/compose/up/), [ps](https://docs.docker.com/reference/cli/docker/compose/ps/), [logs](https://docs.docker.com/reference/cli/docker/compose/logs/), and [down](https://docs.docker.com/reference/cli/docker/compose/down/).
- [Docker version](https://docs.docker.com/reference/cli/docker/version/) and [Docker info reference source](https://github.com/docker/cli/blob/master/docs/reference/commandline/info.md) — client/server verification and system information.
- [Docker Linux post-installation guidance](https://docs.docker.com/engine/install/linux-postinstall/) — privileged Docker group access, boot startup, and log growth.
- [Docker published ports](https://docs.docker.com/engine/network/port-publishing/) — loopback bindings and the exception for Engine versions older than 28.0.0.
- [Docker container restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/) — daemon-managed restart behavior.
- [Official NGINX image manifest](https://github.com/docker-library/official-images/blob/master/library/nginx) — stable tag and supported architectures.
- systemd manual sources: [systemctl](https://github.com/systemd/systemd/blob/v252/man/systemctl.xml) and [journalctl](https://github.com/systemd/systemd/blob/v252/man/journalctl.xml) — service enablement, immediate startup, status, and boot/unit filtering.
- [RPM command reference](https://rpm.org/docs/6.0.x/man/rpm.8) — installed package queries and file listing.

## Issues Found

No technical issues found.

## Review Notes

- No changes to README.md were necessary. The guide contains actionable technical commands and configuration and is relevant to Photon OS 5.
- Photon packages the engine as `docker` and Compose as `docker-compose`. The inspected Compose specification installs the standalone binary and a CLI plugin link under `%{_libexecdir}/docker/cli-plugins`. Its changelog records adding plugin discovery support in package revision 2.20.2-9. The article correctly accounts for older repository snapshots and package revisions instead of assuming all installations expose the plugin.
- The repository migration link is valid and describes moving repository URLs to `packages-prod.broadcom.com`. The GitHub page timed out through the browsing tool; its official raw wiki content was successfully retrieved.
- The package, service, RPM, Docker, and Compose command syntax is consistent with the consulted references. All four Bash code blocks also passed `bash -n` syntax checks.
- The Compose YAML uses supported fields and a correctly quoted host-IP/host-port/container-port mapping. `nginx:stable` is a valid moving tag. The article appropriately limits this example to disposable testing and recommends immutable references for production.
- The localhost publishing warning accurately reflects Docker's documented behavior before Engine 28.0.0. Actual exposure on a vendor-maintained build depends on its fixes; the article already directs readers to check those.
- `unless-stopped` is handled by Docker, and a manually stopped container remains stopped across daemon restarts. Reboot verification should use the running test service. Compose itself does not need to remain running after `up -d`.
- `docker compose down` removes the project's containers and networks by default, retains named volumes unless volume removal is requested, and never removes external volumes. The article's cleanup caution is appropriate.
- This was a documentation and source review with shell syntax checks, not an end-to-end deployment on a Photon OS 5 VM. Package availability for a particular VM, registry pulls, HTTP responses, and reboot recovery were not executed or independently measured.
