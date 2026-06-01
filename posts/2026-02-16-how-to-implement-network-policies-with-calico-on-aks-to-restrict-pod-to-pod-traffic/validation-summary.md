# Validation Summary: How to Use Network Policies with Calico on AKS to Restrict Pod-to-Pod Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service
- Calico
- Kubernetes NetworkPolicy
- Azure CLI
- kubectl
- Kubernetes Services and Deployments

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Azure AKS network policy documentation: https://learn.microsoft.com/en-us/azure/aks/use-network-policies

## Issues Found
- The post said AKS supports only Azure Network Policies and Calico, and described Calico as the most capable AKS option. Updated this to reflect current AKS documentation, which lists Cilium, Azure Network Policy Manager, and Calico, and recommends Cilium for newer clusters.
- The section title framed Calico as categorically preferable to Azure Network Policies. Renamed it to describe AKS network policy options more accurately.
- The post said Azure Network Policies do not support egress policies. Updated this because AKS documentation states Azure Network Policy Manager supports all Kubernetes policy types.
- The post implied standard Kubernetes NetworkPolicy supports Calico-style deny rules and policy ordering. Updated this to distinguish standard Kubernetes NetworkPolicy from Calico extended policy resources, and noted that this guide uses the standard API supported by AKS.
- The post said an existing cluster cannot switch from Azure network policy to Calico. Updated this because AKS documentation supports installing Azure NPM or Calico on an existing cluster with `az aks update --network-policy`, subject to documented limitations.
- The backend test workload used `nginx:1.25` with `containerPort: 8080`, but the default NGINX image listens on port 80. Replaced it with a small HTTP echo container that listens on port 8080 so the service and policies match the test commands.
- The verification commands used `curl` inside NGINX and PostgreSQL containers. Updated the frontend tests to use a labeled `curlimages/curl` pod and the backend-to-database test to use a labeled `postgres:15` pod with `pg_isready`.

## Review Notes
The Kubernetes NetworkPolicy manifests use current `networking.k8s.io/v1` fields and match documented isolation, additive policy behavior, default deny, DNS egress, namespace selector, and ipBlock patterns. `kubectl` is not installed in this workspace, so CLI behavior was checked against official documentation rather than local command execution.
