# Validation Summary: Use AKS Pod Security Admission Controller to Enforce Restricted Security Context

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Kubernetes namespace labels
- Kubernetes securityContext
- kubectl
- Azure CLI
- Azure Monitor diagnostic settings
- Azure Policy for AKS
- Log Analytics KQL

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace label enforcement for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- AKS Pod Security Admission documentation: https://learn.microsoft.com/en-us/azure/aks/use-psa
- Azure Policy for AKS documentation: https://learn.microsoft.com/en-us/azure/aks/use-azure-policy
- Azure Policy built-in definitions for AKS: https://learn.microsoft.com/en-us/azure/aks/policy-reference
- Azure Monitor diagnostic settings documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Azure CLI policy command documentation: https://learn.microsoft.com/en-us/cli/azure/policy
- Azure CLI monitor diagnostic-settings documentation: https://learn.microsoft.com/en-us/cli/azure/monitor

## Issues Found
- The post said the Restricted Pod Security Standard requires a read-only root filesystem. Kubernetes Restricted does not require `readOnlyRootFilesystem`; it is a recommended hardening setting. Updated the profile description, requirements paragraph, and compliant pod comment to make this distinction clear.
- The restricted volume-type list omitted `csi`, which is allowed by the Kubernetes Restricted policy. Added `csi` to the list.
- The AKS version section implied PSA is only available on AKS at Kubernetes 1.25 and later. Kubernetes PSA became generally available in 1.25, but AKS documents PSA as enabled by default on AKS clusters running Kubernetes 1.23 or higher. Updated the wording to distinguish GA status from AKS supported versions.
- The namespace configuration section said PSA is not configured cluster-wide through a single config file. Upstream Kubernetes can configure cluster-wide defaults and exemptions through AdmissionConfiguration, while AKS users cannot directly edit the API server admission configuration. Updated the wording to be AKS-specific.
- The Azure Policy section claimed Azure Policy automatically applies PSA labels and used the privileged-container policy definition ID while describing restricted enforcement. Updated the section to state that Azure Policy enforces equivalent controls through the AKS Azure Policy add-on/Gatekeeper, and changed the CLI snippet to use the built-in restricted pod security standards initiative ID.

## Review Notes
The Kubernetes and AKS examples are otherwise consistent with current official guidance. The Azure Policy snippet is intentionally scoped to the resource group, matching Microsoft Learn's documented assignment flow for AKS clusters with the Azure Policy add-on enabled.
