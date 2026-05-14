# Validation Summary: How to Configure Flux CD with Azure Policy for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Policy for Kubernetes
- Azure CLI
- Flux CD
- Kubernetes
- Gatekeeper
- Open Policy Agent (OPA) / Rego
- Kustomize

## Sources Consulted
- Microsoft Learn: Understand Azure Policy for Kubernetes clusters - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/policy-for-kubernetes
- Microsoft Learn: Azure Policy built-in definitions for Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/policy-reference
- Microsoft Learn: Azure CLI `az policy assignment` reference - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI `az policy state` reference - https://learn.microsoft.com/en-us/cli/azure/policy/state
- Azure Policy built-in definitions repository - https://github.com/Azure/azure-policy
- Gatekeeper documentation: Constraint Templates - https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper documentation: Handling Constraint Violations - https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: kubectl command reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- Azure Policy assignment parameter examples used raw parameter values. Updated the `--params` JSON to use Azure Policy assignment parameter objects with `value` fields, matching the Azure CLI examples and policy assignment model.
- Azure Policy `effect` values were shown in lowercase in several assignment examples. Updated them to documented casing such as `Deny`, `Audit`, and `DeployIfNotExists`.
- The custom Gatekeeper resource limits template declared `cpu` and `memory` parameters as maximum limits, but the Rego only checked whether requests and limits existed. Removed those unused parameters from the template and constraint so the example accurately reflects its behavior.
- The Flux Kustomization comment said policies were applied before applications, but the snippet only defines health checks for the policy Kustomization. Reworded the comment to describe the actual health check behavior.
- The Flux extension policy assignment used an ID that does not match the current built-in policy definition. Updated it to the current built-in policy ID for "Configure installation of Flux extension on Kubernetes cluster."
- The Flux extension policy example used an `audit` effect even though the current built-in policy supports `DeployIfNotExists` and `Disabled`. Updated the example to use `DeployIfNotExists` and added a system-assigned managed identity and location, which are required for deploy-if-not-exists remediation behavior.

## Review Notes
Azure Policy add-on synchronization timing and Gatekeeper audit reporting behavior are consistent with Microsoft documentation. Azure CLI, Flux CLI, and kubectl were not installed in the local environment, so command verification was performed against official documentation and upstream policy definitions rather than local `--help` output.
