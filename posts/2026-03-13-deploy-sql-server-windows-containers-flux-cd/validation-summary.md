# Validation Summary: How to Deploy SQL Server on Windows Containers with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- SQL Server containers
- Windows containers on Kubernetes
- Kubernetes StatefulSet, Service, PersistentVolumeClaim, and CronJob resources
- Flux CD Kustomization resources
- Sealed Secrets
- SQL Server backup commands with `sqlcmd`

## Sources Consulted
- Microsoft Learn: Support policy for SQL Server, including SQL Server in Windows containers: https://learn.microsoft.com/troubleshoot/sql/database-engine/install/windows/support-policy-sql-server
- Microsoft Learn: SQL Server Linux container quickstart and current container image usage: https://learn.microsoft.com/sql/linux/quickstart-install-connect-docker
- Microsoft Learn: Configure and customize SQL Server Docker containers, including `MSSQL_SA_PASSWORD`: https://learn.microsoft.com/sql/linux/sql-server-linux-docker-container-configure
- Kubernetes documentation: Windows containers in Kubernetes and Pod OS requirements: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes documentation: StatefulSets and headless service requirements: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes documentation: Windows storage considerations: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Flux documentation: Kustomization API reference and pruning behavior: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux documentation: Kustomization health checks and reconciliation behavior: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used `mcr.microsoft.com/mssql/server:2022-latest` while describing a Windows container deployment. Microsoft documents that this SQL Server image is a Linux container image, so the examples now use a custom Windows image placeholder and note that a custom image is required for development/testing.
- The post implied SQL Server on Windows containers was a normal supported production deployment. Microsoft states that SQL Server deployments in Windows containers are not covered by support, so the introduction and conclusion now include the development/testing and support caveat.
- The examples used the deprecated `SA_PASSWORD` environment variable. Microsoft documents `MSSQL_SA_PASSWORD` as the current variable, so the StatefulSet and CronJob were updated.
- The StatefulSet `serviceName` pointed at the ClusterIP service instead of the headless service. Kubernetes requires a headless service for StatefulSet network identity, so `serviceName` now references `sql-server-windows-headless`.
- The Windows Pod specs did not set `spec.os.name: windows`. Kubernetes recommends setting the Pod OS field for Windows pods, so it was added to both the StatefulSet pod template and the CronJob pod template.
- The backup CronJob mounted `sql-backup` without defining a volume. Because the backup command runs against the SQL Server instance and writes to the server-side backup path, the invalid CronJob volume mount was removed.
- The prerequisites claimed SQL Server 2022 itself requires Windows Server 2022. This was narrowed to the Windows Server 2022 LTSC custom image/node compatibility requirement.

## Review Notes
The post is technically valid after the corrections, but it remains a development/testing-oriented pattern because Microsoft does not support SQL Server deployments in Windows containers. For production SQL Server on Kubernetes, a supported Linux container deployment or a non-containerized supported SQL Server platform should be considered.
