# Validation Summary: How to Deploy Azure Kubernetes Service with Pulumi in TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi
- TypeScript
- Azure Native Pulumi provider
- Azure Kubernetes Service (AKS)
- Azure managed identities
- Azure RBAC role assignments
- Azure CNI and Calico network policy
- Log Analytics and Container Insights
- Kubernetes namespaces
- Helm with the Pulumi Kubernetes provider
- Jest-style Pulumi unit tests

## Sources Consulted
- Pulumi Azure Native ManagedCluster API documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/containerservice/managedcluster/
- Pulumi Azure Native AgentPool API documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/containerservice/agentpool/
- Pulumi Azure Native RoleAssignment API documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/authorization/roleassignment/
- Pulumi Azure Native listManagedClusterUserCredentials API documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/containerservice/listmanagedclusterusercredentials/
- Pulumi Kubernetes Helm v3 Release API documentation: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/release/
- Pulumi Azure provider guidance: https://www.pulumi.com/docs/iac/clouds/azure/guides/providers/
- Pulumi configuration documentation: https://www.pulumi.com/docs/iac/concepts/config/
- Pulumi secrets handling documentation: https://www.pulumi.com/docs/iac/concepts/secrets/
- Azure AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Azure AKS Spot node pool documentation: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Azure CLI AKS command reference: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft AKS ephemeral OS disk guidance: https://learn.microsoft.com/en-us/azure/aks/concepts-storage
- Local TypeScript validation against @pulumi/azure-native 3.19.0, current @pulumi/pulumi, and current @pulumi/kubernetes.

## Issues Found
- The setup installed and imported `@pulumi/azuread`, but the post did not use any Azure AD provider resources. I removed the unused package and import.
- The example required `environment` before showing any config commands, so the initial preview would fail. I changed the code to default to `pulumi.getStack()` and moved `pulumi preview` after config setup.
- The AKS cluster hard-coded Kubernetes `1.29`, which is no longer a supported regular AKS version as of June 1, 2026. I made the version configurable and defaulted the tutorial to `1.35`.
- The Azure role assignment used an unqualified built-in role definition ID and did not set a GUID role assignment name. I added subscription-aware role definition construction with `getClientConfigOutput()` and a deterministic GUID-style role assignment name.
- The user node pool forced `osDiskType: "Ephemeral"` with VM sizes and a 256 GB OS disk that may not satisfy AKS ephemeral disk constraints. I changed it to `Managed`.
- The AAD-enabled cluster credential call did not request exec-format kubeconfig. I added `format: "exec"` so the returned kubeconfig matches current client-go authentication expectations.
- The dev/staging Spot user node pool would receive AKS's automatic Spot taint, so ingress pods with only a node selector would not schedule there. I added a matching Helm toleration for non-production environments.
- The test mock returned raw inputs for all invokes, which would make the kubeconfig lookup fail while importing `index.ts`. I added a mock result for `listManagedClusterUserCredentials`.
- The second test description said it checked location but actually checked the resource group name. I corrected the test name.

## Review Notes
The corrected TypeScript snippets were assembled into a scratch Pulumi TypeScript project and passed `tsc --noEmit`. The production private cluster setting is valid, but running Pulumi Kubernetes resources against a private AKS API server still requires the Pulumi runner to have network access to that private endpoint.
