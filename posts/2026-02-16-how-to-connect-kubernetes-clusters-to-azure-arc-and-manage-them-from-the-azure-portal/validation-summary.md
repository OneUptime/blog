# Validation Summary: How to Connect Kubernetes Clusters to Azure Arc

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Arc-enabled Kubernetes
- Azure CLI
- Kubernetes
- Azure Arc cluster extensions
- Flux v2 GitOps
- Azure Monitor Container insights
- Azure Policy for Kubernetes
- Microsoft Entra ID / cluster connect

## Sources Consulted
- Microsoft Learn: Quickstart - Connect an existing Kubernetes cluster to Azure Arc, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/quickstart-connect-cluster
- Microsoft Learn: Azure Arc-enabled Kubernetes system requirements, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/system-requirements
- Microsoft Learn: Azure Arc-enabled Kubernetes agent overview, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/conceptual-agent-overview
- Microsoft Learn: Azure CLI reference for az connectedk8s, https://learn.microsoft.com/en-us/cli/azure/connectedk8s
- Microsoft Learn: Tutorial - Deploy applications using GitOps with Flux v2, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2
- Microsoft Learn: Azure CLI reference for az k8s-configuration flux, https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux
- Microsoft Learn: Azure CLI reference for az k8s-extension, https://learn.microsoft.com/en-us/cli/azure/k8s-extension
- Microsoft Learn: Enable monitoring for Arc-enabled Kubernetes clusters, https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable-arc
- Microsoft Learn: Azure Policy for Kubernetes, https://learn.microsoft.com/en-us/azure/governance/policy/concepts/policy-for-kubernetes
- Microsoft Learn: Available extensions for Azure Arc-enabled Kubernetes clusters, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/extensions-release
- Microsoft Learn: Azure Policy built-in definitions for Azure Arc-enabled Kubernetes, https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/policy-reference

## Issues Found
- The prerequisites listed Kubernetes 1.20 or later and 2 CPU cores / 4 GB RAM for Arc agents. Current Microsoft documentation describes support for CNCF-certified clusters with at least one linux/amd64 or linux/arm64 node, and Arc agents require at least 850 MB of free memory plus capacity for about 7% of one CPU. Updated both prerequisite and troubleshooting text.
- The post stated that Helm 3.6 or later must be installed on the workstation. Current Azure Arc quickstart documentation says the connect command installs its own Helm 3.6.3 binary under the `.azure` folder on the deployment machine. Updated the prerequisite.
- The Azure CLI prerequisite used an older fixed version and omitted the `k8s-extension` CLI extension used later in the post. Updated the prerequisite to use the latest Azure CLI, and added installation of `k8s-extension`.
- The resource provider list omitted `Microsoft.ExtendedLocation` in the Azure requirements and `Microsoft.PolicyInsights` for the Azure Policy extension flow. Added the missing provider registrations.
- The agent verification text listed `flux-system` as an Arc agent pod in the `azure-arc` namespace. `flux-system` is the Flux extension namespace, while Arc agents include deployments such as `clusteridentityoperator`, `cluster-metadata-operator`, `config-agent`, and `extension-manager`. Updated the example agent names.
- The portal access section used the old Azure AD name. Updated it to Microsoft Entra ID.
- The troubleshooting section referenced pod security policies, which are removed from current Kubernetes versions. Updated the wording to pod security admission settings or other admission controllers.
- The `az connectedk8s troubleshoot` comment said the check ran from within the cluster. Updated the comment to describe it as diagnostic checks for the connected cluster.

## Review Notes
The remaining Azure CLI examples match current Microsoft CLI references, including `az connectedk8s connect`, `az connectedk8s enable-features --features cluster-connect`, `az k8s-configuration flux create`, `az k8s-extension create`, `az policy assignment create`, `az connectedk8s troubleshoot`, and `az connectedk8s upgrade`. I could not run `az --help` locally because Azure CLI is not installed in this workspace, so CLI validation was performed against Microsoft Learn reference pages.
