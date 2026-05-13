# Validation Summary: How to Use Azure Policy for Kubernetes with Flux on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Policy for Kubernetes
- Open Policy Agent Gatekeeper
- Flux CD
- Kubernetes manifests
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Azure Policy for Kubernetes: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/policy-for-kubernetes
- Microsoft Learn: Azure Policy built-in definitions for AKS: https://learn.microsoft.com/en-us/azure/aks/policy-reference
- Azure Policy built-in definition for privileged containers: https://raw.githubusercontent.com/Azure/azure-policy/master/built-in-policies/policyDefinitions/Kubernetes/ContainerNoPrivilege.json
- Azure Policy built-in definition for container resource limits: https://raw.githubusercontent.com/Azure/azure-policy/master/built-in-policies/policyDefinitions/Kubernetes/ContainerResourceLimits.json
- Azure Policy built-in definition for required pod labels: https://raw.githubusercontent.com/Azure/azure-policy/master/built-in-policies/policyDefinitions/Kubernetes/PodEnforceLabels.json
- Microsoft Learn: az policy assignment CLI reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure Policy exemption structure: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/exemption-structure
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The prerequisites listed Kubernetes 1.24 or later for AKS. Kubernetes 1.24 is no longer a supported AKS version, so this was changed to require an AKS cluster running a supported Kubernetes version.
- The prerequisites pinned Flux CLI 2.0 and Azure CLI 2.40 even though the examples use current Flux APIs and Azure CLI command surfaces. These were changed to require a bootstrapped Flux CLI and a current Azure CLI installation.
- The required-label policy assignment used policy definition ID `96670d01-0a4d-4649-9c89-2d3abc0a5025`, which is the Azure resource group tag policy, not a Kubernetes pod label policy. It was replaced with the Kubernetes pod label policy ID `46592696-4c7b-4bf3-9e45-6c2763bdc0a6`, and the display name was changed from namespaces to pods.
- The namespace exemption example used `az policy exemption create`, but Azure Policy exemptions apply to Azure resource scopes or resources, not Kubernetes namespaces. The example was changed to update the policy assignment's `excludedNamespaces` parameter and keep the Gatekeeper `excludedNamespaces` example for Flux-managed custom constraints.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1` for an Alert. Current Flux documentation shows `Alert` under `notification.toolkit.fluxcd.io/v1beta3`; the v1 notification API reference currently only documents `Receiver`. The example was updated to `v1beta3`.
- The Flux Alert example used `.spec.summary`, which Flux documents as deprecated. It was changed to `.spec.eventMetadata.summary`.

## Review Notes
The custom Gatekeeper `ConstraintTemplate` uses the legacy `spec.targets[].rego` field, which is still documented and takes precedence over `targets[].code[]`. Gatekeeper's current documentation recommends using the `code` array for newer policies, but the existing example is still valid and was not changed because the task asked for correctness fixes only.
