# Validation Summary: How to Run .NET Framework Applications in Windows Containers on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET Framework
- Windows containers
- Docker and Microsoft .NET Framework container images
- Kubernetes Jobs, Deployments, StatefulSets, Services, ConfigMaps, and Secrets
- Entity Framework 6
- SQL Server Linux containers
- C# Windows Services, logging, and health checks

## Sources Consulted
- Microsoft .NET Framework Runtime Docker image documentation: https://hub.docker.com/r/microsoft/dotnet-framework-runtime/
- Microsoft .NET Framework ASP.NET Docker image documentation: https://hub.docker.com/r/microsoft/dotnet-framework-aspnet/
- Microsoft .NET Framework SDK Docker image documentation: https://hub.docker.com/r/microsoft/dotnet-framework-sdk/
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Microsoft SQL Server Linux container quickstart: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker
- Microsoft SQL Server container troubleshooting documentation: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-troubleshooting
- .NET container images documentation: https://learn.microsoft.com/en-us/dotnet/core/docker/container-images

## Issues Found
- Corrected the listed .NET Framework container image versions from generic 4.6 and 4.7 to the supported image version families: 4.6.2, 4.7.x, 4.8, and 4.8.1.
- Reworded the .NET Core comparison because .NET Core and .NET 5+ applications are not inherently self-contained; they can be framework-dependent or self-contained.
- Made the Windows Service build-stage image explicitly use `4.8-windowsservercore-ltsc2022` to match the runtime stage and avoid Windows container OS-version ambiguity.
- Added the required `spec.selector` and matching pod labels to the `apps/v1` Deployment example that uses ConfigMaps and Secrets.
- Fixed the SQL Server StatefulSet to schedule the Linux SQL Server image on Linux nodes, use the supported `/var/opt/mssql` data path, and use `MSSQL_SA_PASSWORD` instead of deprecated `SA_PASSWORD`.
- Reordered and renamed the business-tier SQL password environment variable so Kubernetes can expand `$(MSSQL_SA_PASSWORD)` correctly.
- Added the missing `business-service` Service because the web tier references `http://business-service:8080`.
- Fixed the health-check handler path comparison so prefixes such as `/health/` and `/ready/` match the request paths correctly.

## Review Notes
- The examples are illustrative and still require users to supply real project names, entity classes, images, secrets, and migration executables.
- Windows containers on Kubernetes require Windows worker nodes, and Windows container base image versions must match compatible Windows node OS versions.
- Verified that all YAML snippets parse after the corrections.
