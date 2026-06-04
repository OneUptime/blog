# Validation Summary: How to Use Docker Desktop Resource Management Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Desktop
- Docker Engine CLI
- Docker Compose
- Docker resource constraints
- Docker Desktop file sharing
- Docker Desktop settings files

## Sources Consulted
- Docker Docs: Change your Docker Desktop settings - https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Docker Desktop networking architecture - https://docs.docker.com/desktop/features/networking/
- Docker Docs: Docker Desktop for Linux install notes - https://docs.docker.com/desktop/setup/install/linux/
- Docker Docs: Docker Desktop WSL 2 backend - https://docs.docker.com/docker-for-windows/wsl/
- Docker Docs: Docker Desktop for Mac FAQs - https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/
- Local Docker CLI help for Docker 29.4.2: `docker info --help`, `docker stats --help`, `docker system df --help`, `docker run --help`

## Issues Found
- The post said Docker Desktop runs containers in a VM on macOS and Windows only. Docker Desktop for Linux also runs a VM, so the opening sentence now includes Linux.
- The post stated Docker Desktop defaults to half of available CPU cores. Current Docker Desktop docs do not document that as a fixed default, so the wording now says the default depends on platform and version.
- The post stated Docker Desktop memory defaults are typically 2 GB. Current Docker Desktop docs say the memory limit defaults to 50% of host memory on platforms that expose the setting, so that claim was corrected.
- The OOM exit-code note said exit code 137 indicates an OOM kill. Exit code 137 indicates SIGKILL and is often caused by OOM, but should be confirmed with `.State.OOMKilled`; the wording was corrected.
- The swap monitoring example used `docker info --format '{{.SwapLimit}}'` as if it showed swap usage. That field reports whether container swap limits are supported, so the description was corrected and a `/proc/meminfo` example was added for VM-level swap totals/free space.
- The post referenced Docker Desktop `settings.json` as the settings file. Current Docker Desktop docs use `settings-store.json`, so the macOS and Windows paths were updated.

## Review Notes
The remaining commands and snippets are valid for current Docker CLI and Compose usage. Docker Desktop settings file keys are not documented as a stable public API for all versions; the UI or Docker's managed `admin-settings.json` mechanism is safer for fleet-wide policy.
