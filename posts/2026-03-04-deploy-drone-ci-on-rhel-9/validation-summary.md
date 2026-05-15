# Validation Summary: How to Deploy Drone CI on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder guide

## Technologies Covered
- Drone CI
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd
- journalctl
- rpm

## Sources Consulted
- Drone server overview: https://docs.drone.io/server/overview/
- Drone GitHub server installation: https://docs.drone.io/server/provider/github/
- Drone Docker runner installation: https://docs.drone.io/runner/docker/installation/linux/
- Drone server configuration reference: https://docs.drone.io/server/reference/
- Red Hat Enterprise Linux 9 basic system settings documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/
- Red Hat Enterprise Linux 9 software management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/

## Issues Found
- The post is placeholder content rather than a usable Drone CI deployment guide. It uses unresolved placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>` and does not provide Drone-specific installation, server configuration, runner configuration, or verification steps.
- The documented flow does not match Drone's official installation model. Current Drone documentation distributes the server and Docker runner as container images, configured with environment variables such as `DRONE_GITHUB_CLIENT_ID`, `DRONE_GITHUB_CLIENT_SECRET`, `DRONE_RPC_SECRET`, `DRONE_SERVER_HOST`, `DRONE_SERVER_PROTO`, `DRONE_RPC_HOST`, and `DRONE_RPC_PROTO`.
- The post title and description specifically promise Drone CI on RHEL 9, but the body never installs Docker or another supported container runtime, pulls the `drone/drone:2` server image, starts a Drone server, or installs a runner. Because the technical content is generic and incomplete, it should be removed or replaced with a real Drone CI guide.

## Review Notes
- The generic `systemctl`, `journalctl`, and `rpm -qa` commands are plausible Linux commands, but they do not validate the article as a Drone CI deployment guide because no actual Drone service, package, or configuration path is specified.
