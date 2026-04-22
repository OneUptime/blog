# Validation Summary: How to Set Container Hostname and Domain in Portainer - Set Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker
- Docker container networking
- Docker runtime resource settings
- Linux capabilities
- NVIDIA GPU access for containers

## Sources Consulted
- Portainer documentation: Add a new container - https://docs.portainer.io/user/docker/containers/add
- Portainer documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Docker documentation: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker documentation: Running containers, runtime privileges, capabilities, and devices - https://docs.docker.com/engine/containers/run/
- Docker Hub: nginx Docker Official Image - https://hub.docker.com/_/nginx/
- TensorFlow documentation: Docker GPU image usage - https://www.tensorflow.org/install/docker
- Verified external links: GitHub author profile and OneUptime homepage.

## Issues Found
- The description incorrectly framed hostname/domain settings as service discovery. Updated it to describe identification and name resolution instead.
- The introduction claimed Portainer exposes Docker's full feature set through the UI. Updated this to say it exposes many Docker container settings, which matches Portainer's documented feature set more accurately.
- The setup steps said "creating or editing" but only gave the create-container path. Updated the wording to "creating" to match the listed Portainer navigation.
- Several Portainer UI paths used "Advanced settings" instead of the documented "Advanced container settings" label. Updated those paths.
- The GPU UI path used "GPUs"; Portainer's documented section label is "GPU". Updated the path.
- The post title and description promised hostname/domain configuration, but the body only covered DNS settings. Updated the DNS section to include Docker's `--hostname` and `--domainname` flags and the corresponding Portainer Network fields.
- The Linux capabilities example dropped all capabilities for `nginx` but did not add enough capabilities for the default image to start normally. Added `DAC_OVERRIDE`, `SETGID`, and `SETUID` alongside the existing `NET_BIND_SERVICE` and `CHOWN` entries.
- The privileged-mode comment said privileged containers have full host access. Updated this to "broad host-level access" to avoid overstating the Docker behavior.

## Review Notes
Docker CLI was not installed in the local environment, so command flags were verified against Docker's official CLI reference. Docker's `--domainname` sets the container's UTS/NIS domain name; DNS search domains are controlled separately with `--dns-search`. Portainer's current documentation lists Hostname, Domain Name, Primary DNS Server, and Secondary DNS Server fields under Advanced container settings > Network. The exact minimal Linux capabilities for a container depend on the image and its runtime configuration.
