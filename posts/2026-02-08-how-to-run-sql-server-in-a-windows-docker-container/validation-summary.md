# Validation Summary: How to Run SQL Server in a Windows Docker Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- SQL Server 2022 containers
- SQL Server command-line tools (`sqlcmd`)
- Transact-SQL
- GitHub Actions service containers
- Linux and Windows containers

## Sources Consulted
- Microsoft Learn: Docker: Run Containers for SQL Server on Linux - https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker
- Microsoft Learn: Deploy and connect to SQL Server Linux containers - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment
- Microsoft Learn: Configure and customize SQL Server Docker containers - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-configure
- Microsoft Learn: Configure SQL Server settings with environment variables on Linux - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-configure-environment-variables
- Microsoft Learn: Support policy for SQL Server - https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/install/windows/support-policy-sql-server
- Microsoft Artifact Registry tag list for `mssql/server` - https://mcr.microsoft.com/v2/mssql/server/tags/list
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Compose Specification: healthcheck - https://compose-spec.github.io/compose-spec/spec.html
- GitHub Docs: Creating service containers - https://docs.github.com/en/actions/tutorials/use-containerized-services/create-redis-service-containers

## Issues Found
- The post claimed Microsoft officially supports SQL Server in both Linux and Windows containers. Microsoft documentation says SQL Server deployments in Windows containers are not covered by support, while custom Windows images may be used for development and testing. Updated the introduction, container-selection section, and conclusion to reflect the supported Linux image workflow.
- The post used `mcr.microsoft.com/mssql/server:2022-CU12-windowsservercore-ltsc2022`, but that tag is not present in the Microsoft Artifact Registry tag list and `docker manifest inspect` returned no manifest. Removed the invalid pull and run commands.
- The Windows container example used deprecated `SA_PASSWORD`. Because the referenced Windows image was invalid, the whole example was removed instead of only renaming the variable.
- The local `sqlcmd` example omitted `-C`. Current `mssql-tools18` connections are encrypted by default, and the container commonly uses a self-signed certificate, so the local connection now includes `-C` like the in-container examples.
- The persistence section said data disappears when the container stops. Docker containers retain their writable layer across stop/start; the data is lost when the container is removed unless a volume is used. Updated the wording.
- The initialization script was described as first-run initialization, but it ran scripts on every container start and could fail or duplicate seed data on restart. Added an initialization marker under `/var/opt/mssql`, added readiness failure handling, and made the shell script fail on initialization errors.
- The backup and restore examples wrote to `/var/opt/mssql/backup` without ensuring the directory exists. Added `mkdir -p` before backup and restore copy operations.

## Review Notes
- The remaining examples use the supported `mcr.microsoft.com/mssql/server:2022-latest` Linux image and current `MSSQL_SA_PASSWORD` environment variable.
- The Docker Compose healthcheck string form is valid because the Compose specification treats string healthchecks as `CMD-SHELL`.
- The GitHub Actions service-container pattern, port mapping, and Docker health options match GitHub's documented service-container usage.
