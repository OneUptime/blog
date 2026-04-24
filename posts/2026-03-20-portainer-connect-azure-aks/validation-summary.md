# Validation Summary: How to Connect Portainer to an Azure AKS Cluster - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Microsoft Azure
- Azure Kubernetes Service (AKS)
- Kubernetes
- Azure CLI
- kubectl

## Sources Consulted
- Portainer docs: Import an existing Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer docs: Install Portainer Agent on your Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer docs: Portainer architecture — https://docs.portainer.io/start/architecture
- Microsoft Learn: `az aks get-credentials` — https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials
- Microsoft Learn: Enable Microsoft Entra ID authentication for the AKS control plane — https://learn.microsoft.com/en-us/azure/aks/entra-id-control-plane-authentication
- Kubernetes docs: `kubectl create token` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes docs: Service Accounts — https://kubernetes.io/docs/concepts/security/service-accounts/
- Microsoft Learn: Use labels in an Azure Kubernetes Service (AKS) cluster — https://learn.microsoft.com/en-us/azure/aks/use-labels

## Issues Found
- The original post used a service account plus `kubectl create token --duration=8760h` as a "static" credential workflow. That is inaccurate with current Kubernetes guidance because `kubectl create token` issues time-bound TokenRequest API tokens rather than static long-lived credentials. I replaced this with the documented AKS admin kubeconfig flow and a flattened self-contained kubeconfig for Portainer import.
- The original kubeconfig-import path did not mention current Portainer requirements. I updated the post to state that kubeconfig import is a legacy Portainer Business Edition feature and that Portainer requires a self-contained kubeconfig with cluster-admin credentials and load balancer support.
- The original AKS auth explanation said the key was using a static service account token instead of Azure AD tokens. I corrected this to the current AKS/Microsoft Entra behavior: on Kubernetes 1.24+ Entra-integrated clusters, `clusterUser` kubeconfigs commonly use `exec`/`kubelogin`, and `az aks get-credentials --admin` returns a certificate-based kubeconfig when local accounts are enabled.
- The original Portainer import example used an API payload that was not supported by the current official Portainer documentation I verified. I replaced it with the documented Portainer UI import workflow.
- The original "Method 2" used `helm install ... portainer/portainer-agent`, but current Portainer documentation does not document an agent-only Helm chart for Kubernetes agent deployments and explicitly says YAML manifests are the supported path. I replaced the Helm example with the documented manifest-based workflow generated from the Portainer UI.
- The original private-cluster and conclusion sections described the classic Portainer Agent as communicating outbound from the cluster to Portainer. That is incorrect. Current Portainer architecture docs distinguish this from the Edge Agent: classic Agent requires Portainer Server to reach the agent endpoint, while outbound/tunneled connectivity is an Edge Agent characteristic. I corrected both sections.
- The original AKS node-pool label example grepped for `agentpool`. Current AKS documentation identifies the reserved system label as `kubernetes.azure.com/agentpool`, so I updated the example accordingly.

## Review Notes
- The post is technically relevant and salvageable, but both kubeconfig import and the classic Portainer Agent are legacy options in current Portainer documentation.
- For most remote or private AKS scenarios, Portainer currently recommends the Edge Agent instead of the classic Agent.
- `az aks get-credentials --admin` depends on AKS local accounts being enabled; clusters with local accounts disabled need an agent-based approach instead of admin kubeconfig import.
