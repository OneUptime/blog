# Validation Summary: How to Deploy Windows Containers in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows containers
- Windows Server container images
- .NET Framework
- .NET 8
- ASP.NET Core
- IIS
- Kubernetes Deployments, Jobs, StatefulSets, Services, Ingress, ConfigMaps, Secrets, and PersistentVolumeClaims

## Sources Consulted
- Rancher Windows cluster documentation: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-deployment/custom-clusters/windows/use-windows-clusters.html
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Microsoft Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Kubernetes Windows storage documentation: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- ingress-nginx examples and class guidance: https://kubernetes.github.io/ingress-nginx/examples/
- .NET 8 Windows container tag guidance: https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/multi-platform-tags

## Issues Found
- The Windows image compatibility comments said Windows Server 2022 nodes could run LTSC 2019 images with Hyper-V isolation. I replaced that with Kubernetes-specific guidance stating that Kubernetes supports Windows containers with process isolation only, that image tags should match the Windows Server version of the node, and that mixed-version clusters should use `node.kubernetes.io/windows-build`. This was necessary because Hyper-V isolation is not supported for Kubernetes Windows Pods.
- The prerequisites omitted Rancher's Linux node requirement. I updated the prerequisite to reflect that Rancher Windows clusters are mixed Linux/Windows clusters and need Linux nodes, including at least one Linux worker node. This matches Rancher's Windows cluster requirements.
- The Deployment, Job, and StatefulSet examples included a generic `os=windows:NoSchedule` toleration. I removed those tolerations because that taint is not a Rancher default and the examples already correctly constrain scheduling with `nodeSelector: kubernetes.io/os: windows`.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingressClassName: nginx`, which is the current recommended form for ingress-nginx.
- The ConfigMap comment claimed forward slashes work for Windows paths. I narrowed the comment to recommend Windows-style paths instead, because the original statement was too broad across Windows applications.
- The StatefulSet manifest was invalid because `spec.template.metadata.labels` was missing. I added the matching labels so the selector and pod template are valid.
- The StatefulSet example was also incomplete because StatefulSets require a governing headless Service. I added the required headless Service for `legacy-app`.
- The StatefulSet storage example used `storageClassName: local-path`, which is not an appropriate generic Windows storage recommendation. I replaced it with a Windows-compatible CSI placeholder (`windows-csi`) and clarified that the storage class must be backed by a CSI driver that supports Windows nodes.
- The debugging section used a `powershell` code fence but relied on bash command substitution and `head`. I replaced it with direct `kubectl exec`, `kubectl logs`, and `kubectl describe` resource forms that are documented by current kubectl references.

## Review Notes
- The example registry names, hostnames, image names, secrets, and `windows-csi` storage class are placeholders and still need environment-specific values.
- The Ingress example is specific to ingress-nginx because it uses NGINX annotations. Clusters using Traefik or another controller will need controller-specific configuration.
- The guide's Windows examples are anchored on LTSC 2022 tags. That remains valid, but Windows node and image versions should be kept aligned and updated as Microsoft publishes new base image patches.
