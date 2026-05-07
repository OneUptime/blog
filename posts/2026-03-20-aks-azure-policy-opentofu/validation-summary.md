# Validation Summary: How to Set Up AKS with Azure Policy Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- Azure Policy
- Azure Policy for Kubernetes
- OPA Gatekeeper
- Azure CLI
- `kubectl`

## Sources Consulted
- Azure Policy for Kubernetes: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/policy-for-kubernetes
- Built-in policy definitions for AKS: https://learn.microsoft.com/en-us/azure/aks/policy-reference
- Azure Policy `deny` effect for `Microsoft.Kubernetes.Data`: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deny
- Azure Policy compliance data and evaluation triggers: https://learn.microsoft.com/en-us/azure/governance/policy/how-to/get-compliance-data
- Azure Policy state change events and Event Grid: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/event-overview
- Azure CLI `az policy state` reference: https://learn.microsoft.com/en-us/cli/azure/policy/state
- Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- `azurerm_kubernetes_cluster` provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- `azurerm_resource_policy_assignment` provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_policy_assignment
- Azure built-in initiative source for pod security baseline: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policySetDefinitions/Kubernetes/PSPBaselineStandard.json
- Azure built-in policy source for container resource limits: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Kubernetes/ContainerResourceLimits.json
- Gatekeeper Library required labels template: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels

## Issues Found
- The AKS example pinned `kubernetes_version = "1.28"`, which is no longer a safe current example in May 2026. I removed the hardcoded version and updated the prerequisites to require a currently supported AKS version.
- The prerequisites were incomplete for the commands shown later in the post. I added Azure CLI, `kubectl`, and `Microsoft.PolicyInsights` resource-provider registration because the official AKS and Azure Policy docs require them for the add-on and CLI workflow.
- The built-in policy assignment examples used namespace exclusions that no longer matched the current built-in defaults and guidance. I updated the examples to include `gatekeeper-system`, `azure-arc`, and `azure-extensions-usage-system` alongside `kube-system`.
- The custom Azure Policy example was not valid for AKS as written. It targeted only `Microsoft.Kubernetes/connectedClusters`, referenced a nonexistent Azure Policy built-in reference URL, hardcoded `deny` in the rule while also passing an unused assignment parameter, and used an incorrect `values` shape. I replaced it with a valid `Microsoft.Kubernetes.Data` custom definition that targets both AKS and Arc resource types, uses `templateInfo` as required by current docs, and points to the official Gatekeeper Library `requiredlabels` template.
- The policy compliance reporting example used the AKS metric `cluster_autoscaler_unschedulable_pods_count`, which is unrelated to Azure Policy compliance. I replaced that section with the supported Policy Insights and Event Grid approach and current `az policy state` commands.
- The deployment validation commands included `kubectl get constraints`, which isn't the command pattern documented by Azure Policy for Kubernetes. I replaced it with concrete checks for `constrainttemplates` and the specific constraint kinds created by the examples.
- The introduction and conclusion overstated or blurred a few behaviors. I corrected the wording so the post reflects current Azure Policy effect names and the documented sync/evaluation timing for the add-on.

## Review Notes
- For component-level violation details on Kubernetes objects behind the AKS resource, `az policy state list --expand "Components(...)"` can provide deeper inspection than the simpler summary commands used in the post.
- The updated custom policy uses the official Gatekeeper Library template URL. If that upstream template changes, readers should revalidate the policy definition before reusing it in production.
