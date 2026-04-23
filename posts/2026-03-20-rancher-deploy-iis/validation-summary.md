# Validation Summary: How to Deploy IIS on Windows Nodes in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Windows containers
- IIS
- ASP.NET Framework
- Docker
- Kubernetes Ingress, Services, ConfigMaps, Secrets, and StatefulSets
- Persistent storage on Windows nodes

## Sources Consulted
- Rancher Docs: Launching Kubernetes on Windows Clusters - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher Docs: Node Requirements for Rancher Managed Clusters - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/node-requirements-for-rancher-managed-clusters
- Kubernetes Docs: Guide for Running Windows Containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Docs: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Docs: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Docs: Windows Storage - https://kubernetes.io/docs/concepts/storage/windows-storage/
- Microsoft Learn: Using Windows Containers to "Containerize" Existing Applications - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/lift-shift-to-containers
- Microsoft Learn: Upgrade containers to a new version of the Windows operating system - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/upgrade-windows-containers
- Microsoft Learn: Process Model Settings for an Application Pool `<processModel>` - https://learn.microsoft.com/en-us/iis/configuration/system.applicationhost/applicationPools/add/processModel
- Microsoft Learn: `<applicationPool>` Element (Web Settings) - https://learn.microsoft.com/en-us/dotnet/framework/configure-apps/file-schema/web/applicationpool-element-web-settings
- Microsoft Learn: Create the Web.config file for an ASP.NET application - https://learn.microsoft.com/en-us/troubleshoot/developer/webapps/aspnet/performance/create-web-config
- Microsoft Learn: HttpUtility.JavaScriptStringEncode Method - https://learn.microsoft.com/en-us/dotnet/api/system.web.httputility.javascriptstringencode?view=net-10.0

## Issues Found
- The introduction said containerized IIS preserves "full Windows server functionality". Microsoft’s Windows container guidance distinguishes containers from full VMs/servers, so this was narrowed to a technically accurate description.
- The prerequisites did not state that Rancher Windows clusters still need Linux nodes for control plane and ingress-related components. This was corrected, and a storage prerequisite was added for the persistence example.
- The Dockerfile set `processModel.identityType` to `0`, which maps to `LocalSystem`. IIS documentation shows `ApplicationPoolIdentity` as the correct baseline for application pools, so the value was changed to `4`.
- The deployment and StatefulSet used an `ltsc2022` image without constraining scheduling to matching Windows nodes. Kubernetes requires Windows pod and node version compatibility, so `node.kubernetes.io/windows-build: "10.0.20348"` was added.
- The ingress example used the deprecated `kubernetes.io/ingress.class` annotation. This was replaced with `spec.ingressClassName: nginx`.
- The ConfigMap example claimed ASP.NET concurrency settings could be overridden through Kubernetes environment variables. Microsoft documents those settings as configuration-file settings, not generic env-var overrides, so the example was replaced with a real application ConfigMap and wired into the deployment.
- The StatefulSet example was incomplete and invalid because its selector did not match pod labels and it referenced a regular Service instead of a required headless Service. The headless Service and matching labels were added, and the hard-coded non-portable storage class was removed.
- The health check page embedded raw exception text into JSON. That could break JSON formatting when the message contained quotes or backslashes, so the response now uses `HttpUtility.JavaScriptStringEncode`.

## Review Notes
- The examples now consistently target Windows Server 2022 because the image tag is `mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022`. For Windows Server 2019, the base image tag and the `node.kubernetes.io/windows-build` selector must both be changed to matching 2019 values.
- Kubernetes documents `LogMonitor` as the recommended way to surface Windows container logs to `kubectl logs`. Persistent IIS log volumes are still valid when file retention is specifically required.
