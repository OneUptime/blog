# Validation Summary: How to Deploy Windows Container Workloads with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Deployments and Services
- Kubernetes Windows containers
- Windows Server container images
- Kubernetes node selectors, taints, and tolerations
- Kubernetes image pull secrets
- AKS / managed Kubernetes Windows node pools

## Sources Consulted
- Kubernetes documentation: Windows containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes documentation: Guide for Running Windows Containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes kubectl reference: `kubectl create secret docker-registry` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Flux documentation: Kustomization API and examples - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reference: `flux get kustomizations` - https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Microsoft Learn: AKS FAQ, Windows OS deprecations - https://learn.microsoft.com/en-us/azure/aks/faq
- Microsoft Learn: Windows container version compatibility - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Upgrade a Windows container to a new build version - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/upgrade-windows-containers

## Issues Found
- The post stated that Windows workloads require OS-specific tolerations. Kubernetes requires Windows node targeting, but tolerations are only required when Windows nodes are tainted. Updated the introduction, deployment explanation, manifest comment, best practices, and conclusion to make tolerations conditional on tainted nodes.
- The `kubectl get nodes -L kubernetes.io/os` expected output showed an `OS-IMAGE` column. That command adds the `KUBERNETES.IO/OS` label column; `OS-IMAGE` is part of wide node output. Updated the example output to match the command.
- The prerequisites listed Windows Server 2019 or 2022. Current upstream Kubernetes documentation lists Windows Server 2022 and 2025 as supported Windows node operating systems, and AKS no longer supports Windows Server 2019 node pools as of March 01, 2026. Updated the prerequisite to require a currently supported Windows Server version such as 2022 or 2025 depending on provider support.
- The Windows taint check implied `os=windows:NoSchedule` is always expected. Kubernetes documents this as a taint users or cluster administrators may apply. Updated the wording to say this applies if the cluster taints Windows nodes.
- The toleration example omitted `operator: Equal`. Kubernetes defaults to `Equal` when omitted, so the original was valid, but the field was added for clarity and to match Kubernetes' documented example.
- The deployment comment said "No init containers for Windows." Kubernetes supports init containers generally, but Windows pods need Windows-compatible images. Updated the comment accordingly.
- Step 5 referred to an image pull timeout while using `terminationGracePeriodSeconds`, which controls container shutdown grace period rather than image pull timeout. Updated the text and comment to describe shutdown grace periods.
- The best practices section stated Windows images are "2-10GB." Image sizes vary by image and version. Reworded this to "often several GB" to avoid an overly specific size claim.

## Review Notes
The Flux Kustomization snippet uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields such as `interval`, `path`, `prune`, `sourceRef`, `timeout`, and `healthChecks`. The `kubectl create secret docker-registry` command and the `flux get kustomizations -A --watch` command match official references. The IIS image tag `mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022` is documented by Microsoft.
