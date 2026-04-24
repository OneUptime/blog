# Validation Summary: How to Install Portainer on macOS with Docker Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Docker Desktop for macOS
- Docker CLI
- Docker Compose / Portainer Stacks
- OrbStack
- Homebrew

## Sources Consulted
- Docker Docs: Install Docker Desktop on Mac — https://docs.docker.com/desktop/setup/install/mac-install/
- Docker Docs: Understand permission requirements for Docker Desktop on Mac — https://docs.docker.com/desktop/setup/install/mac-permission-requirements/
- Docker Docs: Docker Desktop license agreement — https://docs.docker.com/subscription/desktop-license/
- Docker Docs: Change your Docker Desktop settings — https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Docs: `docker system info` — https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Install Portainer CE with Docker on Linux (LTS) — https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Docs: Updating on Docker Standalone — https://docs.portainer.io/start/upgrade/docker
- OrbStack Docs: Frequently asked questions — https://docs.orbstack.dev/faq
- Homebrew Formulae: `docker-desktop` cask — https://formulae.brew.sh/cask/docker-desktop
- Homebrew Formulae: `orbstack` cask — https://formulae.brew.sh/cask/orbstack

## Issues Found
1. **The macOS prerequisite and Apple Silicon wording were outdated.** The post said `macOS 12 (Monterey) or newer` and explicitly listed only `M1/M2/M3`. Docker now documents support as the current and previous two major macOS releases, and the install docs use generic Apple Silicon wording. Updated the prerequisite and Apple Silicon references accordingly.

2. **The Homebrew install command for Docker Desktop was outdated.** The post used `brew install --cask docker`, but the current Homebrew cask is `docker-desktop` and `docker` is only a former token. Updated the command to `brew install --cask docker-desktop`.

3. **The Portainer image tag did not match Portainer's current install and upgrade guidance.** The post used `portainer/portainer-ce:latest`. Portainer's current official install and update docs use the `:lts` tag. Updated the deployment and update commands to `portainer/portainer-ce:lts` and noted that port `8000` is optional unless Edge agents are used.

4. **The Docker Desktop subscription section was inaccurate.** The original text used a simplified `250+ employees or >$10M revenue` rule and omitted government entities. Docker's current license terms state the free small-business tier applies only when the company has fewer than 250 employees **and** less than $10M annual revenue, and government entities require a paid subscription. Corrected the wording.

5. **The OrbStack section contained two inaccuracies.** The install command should be `brew install --cask orbstack`, and OrbStack is no longer simply "free" for all users. Updated the command and licensing note to reflect OrbStack's current personal-free / business-paid model. Also clarified that Portainer depends on the `/var/run/docker.sock` compatibility symlink when using the same socket-mount approach.

6. **"Portainer CLI" was misleading in the shell alias section.** The example defines a shell alias, not a Portainer CLI command. Reworded the text to describe it accurately.

7. **The Compose stack example used an obsolete top-level `version` field.** Current Docker Compose documentation marks the top-level `version` element as obsolete and only kept for backward compatibility. Removed `version: '3'` from the YAML example.

8. **One Docker Desktop settings label was outdated.** The post referred to `Disk image size`, while current Docker Desktop settings use `Disk usage limit` in the Resources → Advanced section. Updated the wording to match the current UI/docs.

9. **The browser certificate-warning instruction was too browser-specific.** The exact button text varies by browser and version. Replaced it with a generic instruction to accept the self-signed certificate warning in the browser.

## Review Notes
- The Portainer socket-mount command assumes the default `/var/run/docker.sock` path is available. Docker Desktop documents this as a configurable installation option, so users who disabled that symlink may need to re-enable it or adjust their setup.
- The post now follows Portainer's `:lts` recommendation instead of pinning an exact version. This matches official Portainer documentation and is appropriate for a general installation guide.
