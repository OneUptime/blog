# Validation Summary: How to Use Nano Server Base Image for Windows Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows containers
- Microsoft Nano Server, Server Core, and Windows Server container base images
- Dockerfiles and Docker CLI
- .NET 8 / ASP.NET Core containers
- Go Windows containers
- Node.js Windows containers
- Docker manifest lists

## Sources Consulted
- Microsoft Learn: Overview of Windows Container base images: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Dockerfile and Windows containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/manage-windows-dockerfile
- Microsoft Learn: What OS to target with .NET containers: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/net-core-net-framework-containers/net-container-os-targets
- Docker Docs: docker manifest: https://docs.docker.com/reference/cli/docker/manifest/
- Docker Docs: Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Node.js Release Working Group schedule: https://github.com/nodejs/release
- Node.js downloads page: https://nodejs.org/en/download
- Docker Hub official Go image tags: https://hub.docker.com/_/golang/tags
- Docker Hub official Node image: https://hub.docker.com/_/node
- Docker CLI manifest inspection for the referenced MCR and Docker Hub images.

## Issues Found
- Corrected the claim that Nano Server includes PowerShell Core. Microsoft documents that PowerShell, WMI, and the Windows servicing stack are absent from Nano Server, so the post now states that neither Windows PowerShell nor PowerShell Core is included by default.
- Corrected the plain Nano Server runtime description. The base image can support modern .NET workloads, but the plain base image does not include a .NET runtime; the post now points readers to .NET Nano Server runtime images or self-contained apps.
- Updated stale runtime examples: Go changed from `golang:1.22-windowsservercore-ltsc2022` to `golang:1.26-windowsservercore-ltsc2022`, and Node.js changed from EOL Node 20.11.0 to Node 24.15.0 LTS.
- Fixed the Node.js Dockerfile to run `npm.cmd` instead of non-existent `npm.exe`, and replaced the deprecated-style production install flag with `--omit=dev`.
- Changed the Go Dockerfile claim from a generic static binary to a single Windows binary without cgo dependencies and added `CGO_ENABLED=0`.
- Renamed "Multi-Architecture Builds" to "Multi-Version Builds" because the example varies Windows LTSC versions, not CPU architectures.
- Fixed standalone Dockerfile fragments that referenced an undefined `build` stage by copying a local `publish` directory instead.
- Replaced invalid `mcr.microsoft.com/windows:ltsc2022` with the valid Windows Server base image reference `mcr.microsoft.com/windows/server:ltsc2022`.

## Review Notes
The size numbers remain approximate because Windows container image sizes vary by tag, host, compression, and servicing update level. The commands and Dockerfile snippets are now aligned with current official documentation and available image manifests as of 2026-06-04.
