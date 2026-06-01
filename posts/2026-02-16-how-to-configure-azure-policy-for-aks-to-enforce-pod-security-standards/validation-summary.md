# Validation Summary: How to Configure Azure Policy for AKS to Enforce Pod Security Standards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Policy
- Azure CLI
- Kubernetes Pod Security Standards
- Gatekeeper / Open Policy Agent
- kubectl

## Sources Consulted
- Microsoft Learn: Secure your Azure Kubernetes Service (AKS) clusters with Azure Policy - https://learn.microsoft.com/en-us/azure/aks/use-azure-policy
- Microsoft Learn: Learn Azure Policy for Kubernetes - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/policy-for-kubernetes
- Microsoft Learn: Azure Policy built-in definitions for Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/policy-reference
- Microsoft Learn: az policy assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: az policy exemption CLI reference - https://learn.microsoft.com/en-us/cli/azure/policy/exemption
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Azure Policy built-in baseline initiative source - https://github.com/Azure/azure-policy/blob/master/built-in-policies/policySetDefinitions/Kubernetes/PSPBaselineStandard.json
- Azure Policy built-in restricted initiative source - https://github.com/Azure/azure-policy/blob/master/built-in-policies/policySetDefinitions/Kubernetes/PSPRestrictedStandard.json
- Azure Policy built-in policy source: AllowedUsersGroups - https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Kubernetes/AllowedUsersGroups.json
- Azure Policy built-in policy source: HostNetworkPorts - https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Kubernetes/HostNetworkPorts.json
- Azure Policy built-in policy source: ContainerNoPrivilege - https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Kubernetes/ContainerNoPrivilege.json

## Issues Found
- The prerequisites said Kubernetes 1.25 or later was required. In 2026, AKS supports only current GA minor versions, and recent Azure Policy add-on versions require newer supported Kubernetes versions. Updated the prerequisite to require a supported AKS version and note the recent 1.27+ add-on requirement.
- The Restricted Pod Security Standards description said read-only root filesystems are required. Kubernetes Restricted PSS does not require `readOnlyRootFilesystem`; it requires controls such as non-root execution, no privilege escalation, seccomp, restricted volumes, and dropping capabilities. Updated the description.
- The post identified policy set definition `a8640138-9b0a-4a28-b8cb-1666c838647d` as an approved-capabilities initiative. That GUID is the Kubernetes cluster pod security baseline standards for Linux-based workloads initiative. Corrected the sentence.
- The policy exemption example passed the assignment name to `--policy-assignment`, but Azure CLI documents this parameter as the referenced policy assignment ID. Added an `az policy assignment show` command to capture the assignment ID and pass it to `az policy exemption create`.

## Review Notes
- The Azure CLI commands use valid current parameters according to Microsoft Learn. Azure CLI was not installed locally in this environment, so command verification was performed against official CLI documentation rather than local `--help`.
- Azure Policy add-on sync can take up to 20 minutes, which matches the post's timing guidance.
- The built-in Azure Policy Kubernetes exclusions already exclude system namespaces such as `kube-system` and `gatekeeper-system` by design, but keeping explicit exclusions in the examples is harmless and makes the behavior clear.
