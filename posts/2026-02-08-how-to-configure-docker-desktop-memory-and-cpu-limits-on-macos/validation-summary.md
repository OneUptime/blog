# Validation Summary: How to Configure Docker Desktop Memory and CPU Limits on macOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop for Mac
- Docker Engine CLI
- Docker Compose
- macOS
- Apple Silicon virtualization
- VirtioFS

## Sources Consulted
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Desktop for Mac VMM documentation: https://docs.docker.com/desktop/features/vmm/
- Docker Desktop for Mac FAQ: https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/
- Docker Desktop release notes: https://docs.docker.com/desktop/release-notes/
- Docker Engine resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose deploy resources reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker CLI events reference: https://docs.docker.com/reference/cli/docker/system/events/
- Local Docker CLI help for `docker stats`, `docker inspect`, and `docker events`

## Issues Found
- Docker Desktop settings file path was outdated. The post used `settings.json` as the current macOS settings file, but current Docker Desktop documentation uses `settings-store.json`; Docker Desktop 4.34 and earlier used `settings.json`. Updated the path and added the version caveat.
- Default resource allocation was outdated. The post said Docker Desktop defaults to half the CPU cores, 2-4 GB memory, and a 64 GB virtual disk. Current Docker documentation says memory defaults to 50% of host memory, swap defaults to 1 GB, recent release notes say containers now use all host CPU cores by default, and recent release notes say the disk usage limit is based on the host filesystem size on fresh install/reset. Updated the defaults and example.
- Apple Silicon virtualization backend was overstated. The post said Apple Silicon Macs run through Apple's Virtualization framework, but Docker Desktop also supports Docker VMM on Apple Silicon. Updated the wording to include both options.
- Apple Silicon memory explanation was too absolute. The post implied allocating 8 GB on a 16 GB M-series Mac still leaves macOS responsive because memory is unified. Updated it to clarify that Docker VM memory still counts against physical RAM and should be tuned based on host memory pressure.
- Reset example could cause data loss. The post said resource settings could be reset without losing containers/images while also setting `diskSizeMiB` to 64 GB. Docker's Mac FAQ says reducing the maximum disk image size deletes the current disk image and loses containers/images. Updated the text and removed the disk size assignment from the reset script.

## Review Notes
Most Docker CLI examples were current and matched documented command flags or local CLI help. The direct editing of Docker Desktop's settings file is version-sensitive because Docker Desktop settings are application internals rather than Docker Engine's `daemon.json`; GUI changes remain the safer user-facing workflow.
