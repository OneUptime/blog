# Validation Summary: How to Configure Windows Pod Resource Limits for CPU and Memory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods, Deployments, ResourceQuota, LimitRange, and QoS classes
- Kubernetes CPU and memory requests and limits
- Kubernetes Windows nodes
- Windows containers, Host Compute Service, and job object resource controls
- PowerShell in Windows Server Core containers
- kubectl resource inspection commands

## Sources Consulted
- Kubernetes: Resource Management for Windows nodes - https://kubernetes.io/docs/concepts/configuration/windows-resource-management/
- Kubernetes: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: LimitRange API reference - https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes: kubectl top pod reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes: kubectl describe reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Microsoft Learn: Implementing resource controls for Windows containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/resource-controls
- Microsoft Learn: Overview of Windows Container base images - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Deploy and connect to SQL Server Linux containers - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment

## Issues Found
- The post described Windows memory limits as causing Linux-style OOM kills. Kubernetes documents that Windows nodes do not overcommit memory in the same way and can page to disk instead, so I changed the explanation and monitoring guidance to focus on memory pressure, paging, and terminated containers.
- The post described CPU requests as guaranteed CPU. Kubernetes documents that Windows can cap CPU time but cannot guarantee a minimum amount of CPU time, so I changed the request/limit explanations and CPU comments to distinguish scheduler reservation from runtime enforcement.
- Several examples used `mcr.microsoft.com/windows/nanoserver:ltsc2022` with `powershell`. Microsoft documents that Nano Server does not include PowerShell or WMI, so I changed those examples to use Windows Server Core.
- The memory tier example used `mcr.microsoft.com/mssql/server:2022-latest` as a Windows workload. Microsoft documents that SQL Server container images are Linux-based and Windows container deployments are not covered by support, so I replaced it with a generic Windows line-of-business application image.
- The resource sampling example implied that it measured a production application directly. I clarified that the sampling loop should be adapted inside the application container and that the shown memory measurement is for the PowerShell process.

## Review Notes
All YAML snippets were parsed successfully after the fixes. The `kubectl top` commands require Metrics Server or another metrics pipeline to be installed in the cluster.
