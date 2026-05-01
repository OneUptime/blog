# Validation Summary: How to Deploy Windows Containers in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows containers
- Docker
- IIS
- .NET Framework

## Sources Consulted
- Rancher: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- RKE2 requirements: https://docs.rke2.io/install/requirements
- Kubernetes Windows user guide: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Windows overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes resource management for Windows nodes: https://kubernetes.io/docs/concepts/configuration/windows-resource-management/
- Kubernetes probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Pods and Pod OS field: https://kubernetes.io/docs/concepts/workloads/pods/
- Microsoft Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Windows container base images: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- ASP.NET Core environments reference for `ASPNETCORE_ENVIRONMENT`: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments?view=aspnetcore-10.0
- ASP.NET configuration builders for .NET Framework: https://learn.microsoft.com/en-us/aspnet/config-builder

## Issues Found
- The post said Windows containers should not use CPU limits. I corrected this to match Kubernetes documentation: Windows can enforce CPU limits, while CPU requests are mainly used for scheduling and do not guarantee a minimum amount of CPU time.
- The Rancher networking note said Flannel VXLAN is required. I updated it to reflect current Rancher/RKE2 guidance, which supports Windows clusters with either Calico or Flannel.
- The introduction did not state that Rancher Windows workloads run in mixed Linux/Windows clusters. I updated that sentence so it matches Rancher’s documented architecture.
- The Deployment example only selected `kubernetes.io/os: windows` even though the container image example is pinned to Windows Server 2022. I added `.spec.os.name: windows` and `node.kubernetes.io/windows-build: "10.0.20348"` so the manifest matches current Kubernetes guidance for Windows workloads and version-specific scheduling.
- The Deployment example used `ASPNETCORE_ENVIRONMENT` and `ConnectionStrings__DefaultConnection` in a .NET Framework/IIS example. I replaced them with generic application environment variable names because the original names imply ASP.NET Core-specific configuration behavior that does not apply by default to classic .NET Framework apps.
- The Step 4 heading referenced Ingress even though the post only provided a Service manifest. I corrected the heading to match the actual example.
- The Step 5 probe comment implied Windows containers only use HTTP or TCP probes. I narrowed the comment so it accurately describes the snippet as an example HTTP probe configuration.
- The conclusion now refers to matching the Windows build between the image and the node, which is the compatibility rule documented by Microsoft for process-isolated Windows containers.

## Review Notes
- The sample Deployment now targets Windows Server 2022 specifically. If the image tag is changed to a Windows Server 2019 image, the `node.kubernetes.io/windows-build` selector should also be changed to the matching 2019 build label.
- Rancher Windows nodes remain worker-only, and Rancher requires Linux nodes for the control plane and supporting cluster services such as the cluster agent, DNS, metrics, and ingress.
