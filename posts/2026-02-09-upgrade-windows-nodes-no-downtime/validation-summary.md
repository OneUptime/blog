# Validation Summary: How to Upgrade Windows Nodes in a Kubernetes Cluster Without Downtime

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- Windows nodes in Kubernetes
- kubectl cordon, drain, and uncordon
- PodDisruptionBudgets
- Windows PowerShell
- PSWindowsUpdate
- Azure Kubernetes Service (AKS)
- Amazon Elastic Kubernetes Service (EKS)

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes safe node drain task: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes Pod disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes Windows nodes documentation: https://kubernetes.io/docs/setup/production-environment/windows/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- Microsoft Learn Install-Module reference: https://learn.microsoft.com/en-us/powershell/module/powershellget/install-module
- PowerShell Gallery PSWindowsUpdate package: https://www.powershellgallery.com/packages/PSWindowsUpdate/
- Azure AKS node pool upgrade documentation: https://learn.microsoft.com/en-us/azure/aks/upgrade-node-pools
- AWS CLI update-nodegroup-version reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-version.html
- Amazon EKS managed node group update documentation: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html

## Issues Found
- The metadata tag used "Window" instead of "Windows". Changed the tag to "Windows".
- The description and introduction described "zero downtime" too absolutely. Updated those claims to "minimizing downtime" because Kubernetes PodDisruptionBudgets limit voluntary disruptions for replicated workloads but do not guarantee application availability by themselves.
- The pre-upgrade section did not mention Kubernetes version skew constraints. Added a short note that kubelet must not be newer than kube-apiserver and that provider-supported upgrade paths should be followed.
- The standard drain commands used `--force`. Removed it from the default rolling upgrade examples because `--force` is only needed for unmanaged pods and is risky in a no-downtime maintenance path. Added a note explaining when it is appropriate.
- The first Windows update example used `Install-WindowsUpdate` without installing/importing the PSWindowsUpdate module. Added `Install-Module -Name PSWindowsUpdate -Force` and `Import-Module PSWindowsUpdate`.
- Kubernetes version examples used `1.28`, which is outdated as of the validation date. Updated example Kubernetes versions to `1.35.0` for kubelet/AKS and `1.35` for EKS.

## Review Notes
The remaining commands and manifests are broadly consistent with current Kubernetes, AKS, EKS, and PowerShell documentation. Actual no-downtime behavior still depends on replicated workloads, valid PodDisruptionBudgets, enough spare cluster capacity, correct readiness probes, and application-level high availability.
