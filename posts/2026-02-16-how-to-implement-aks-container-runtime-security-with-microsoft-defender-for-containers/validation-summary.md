# Validation Summary: How to Use AKS Container Runtime Security with Microsoft Defender for Containers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Defender for Containers
- Microsoft Defender for Cloud
- Azure Container Registry (ACR)
- Azure CLI
- Azure Policy for Kubernetes
- Kubernetes Pod Security Standards
- Kubernetes securityContext settings

## Sources Consulted
- Microsoft Defender for Containers enablement docs: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-enable-plan
- Defender for Containers Azure CLI deployment docs: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-deploy-azure-cli
- Defender for Containers overview and runtime/vulnerability capabilities: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-introduction
- Defender for Containers vulnerability assessment docs: https://learn.microsoft.com/en-gb/azure/defender-for-cloud/agentless-vulnerability-assessment-azure
- Defender for Containers troubleshooting and sensor label docs: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-troubleshoot
- Defender for Cloud alert schema docs: https://learn.microsoft.com/en-us/azure/defender-for-cloud/alerts-schemas
- Azure CLI security sub-assessment docs: https://learn.microsoft.com/en-us/cli/azure/security/sub-assessment
- Azure CLI security contact docs: https://learn.microsoft.com/en-us/cli/azure/security/contact
- AKS Azure Policy built-in definitions: https://learn.microsoft.com/en-us/azure/aks/policy-reference
- AKS Azure Policy usage docs: https://learn.microsoft.com/en-us/azure/aks/use-azure-policy
- Microsoft Defender for Cloud pricing page: https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/

## Issues Found
- The prerequisites pinned AKS to Kubernetes 1.24 or later. Kubernetes 1.24 is no longer a useful current baseline for AKS guidance, so this was changed to require an AKS and Defender-supported Kubernetes version.
- The prerequisites listed Azure CLI 2.50 and Owner/Contributor permissions. Microsoft documentation lists Azure CLI 2.40 or later and Contributor or Security Admin permissions for deploying Defender components, so the prerequisites were corrected.
- The Defender profile verification command returned the whole Defender object instead of the documented enabled flag. It now queries `securityProfile.defender.securityMonitoring.enabled`.
- The Defender sensor verification commands used the stale `app=microsoft-defender` label. Current Microsoft docs reference the `microsoft-defender-collector-ds` DaemonSet and `app=defender` label, so the pod, log, describe, and DaemonSet commands were corrected.
- The ACR vulnerability scanning section used the deprecated `ContainerRegistry` Defender plan. The section now references the current Defender for Containers `Registry access` component and verifies the `Containers` plan.
- The `az security sub-assessment list` example used a non-existent `--assessed-resource-type` flag and incorrect output paths. It now uses the documented `--assessment-name` filter and `properties.*` query fields.
- The Azure Policy add-on verification command used an in-cluster label that is less reliable than the supported AKS add-on profile check. It now verifies `addonProfiles.azurepolicy.enabled`.
- The alert review section referenced the retired Azure Security Center name. It now uses Microsoft Defender for Cloud.
- The notification setup used an invalid `az security automation create` command and attempted to route Defender alerts through an action group directly. It now uses `az security contact create`, which is the documented CLI path for Defender for Cloud email notifications.
- The cost section stated a fixed approximate price and that ACR vulnerability scanning is simply included. It now describes per-vCore billing and the included registry vulnerability assessment allowance without hard-coding a potentially stale price.

## Review Notes
The Azure Policy initiative ID for the Kubernetes pod security baseline matches the documented built-in initiative name. The exact price and included scan allowance can vary by region and over time, so the post now points readers to the pricing page instead of embedding a fixed dollar value.
