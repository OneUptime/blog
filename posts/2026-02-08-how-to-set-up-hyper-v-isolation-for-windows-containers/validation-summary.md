# Validation Summary: How to Set Up Hyper-V Isolation for Windows Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows containers
- Hyper-V isolation
- Process isolation
- Docker Engine and Docker CLI
- Docker Compose
- Windows Server 2019 and 2022
- Windows 10 and 11
- PowerShell Hyper-V and Windows feature cmdlets

## Sources Consulted
- Microsoft Learn: Isolation modes for Windows containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/hyperv-container
- Microsoft Learn: Windows container version compatibility - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Install Hyper-V in Windows and Windows Server - https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/Install-Hyper-V
- Microsoft Learn: Run Hyper-V in a Virtual Machine with Nested Virtualization - https://learn.microsoft.com/en-us/virtualization/hyper-v-on-windows/user-guide/enable-nested-virtualization
- Docker Docs: docker container run reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: docker system info reference - https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post stated that process-isolated Windows containers must match the host OS version exactly. Microsoft documents a more nuanced rule: process isolation depends on build compatibility, Windows Server 2016 also requires matching revisions, and Windows Server version 1809 and later do not require matching revisions. Updated the post to describe compatible host/container versions instead of exact matches.
- The post implied Hyper-V isolation removes all Windows version restrictions. Microsoft's compatibility matrix still has unsupported host/image combinations, even with Hyper-V isolation. Updated the wording to say Hyper-V isolation supports different Windows versions only where the combination is supported.
- The post said Hyper-V isolation is required on Windows 10/11 for Windows containers. Docker and Microsoft document Hyper-V isolation as the default on Windows client OSes, while process isolation is available in limited development/test scenarios. Updated the wording accordingly.

## Review Notes
The Docker `--isolation=hyperv` and `--isolation=process` examples, Docker daemon `exec-opts` configuration, Compose `isolation` field, Hyper-V installation commands, resource limit flags, and nested virtualization command are consistent with the official documentation reviewed. The performance and memory figures are reasonable guidance but should be treated as workload-dependent estimates rather than guaranteed values.
