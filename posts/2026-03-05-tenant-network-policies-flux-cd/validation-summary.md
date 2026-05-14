# Validation Summary: How to Configure Tenant Network Policies with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Kubernetes namespaces and labels
- Kustomize
- Flux CD multi-tenancy
- GitOps
- CNI plugins

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Kubernetes namespace automatic labelling documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#automatic-labelling
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kustomize kustomization file reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux `create tenant` command documentation: https://fluxcd.io/flux/cmd/flux_create_tenant/

## Issues Found
- The default deny wording said the policy blocks all ingress and egress traffic. Kubernetes documents NetworkPolicy isolation as applying to pod traffic, with special handling for traffic from the pod's node, so the wording was tightened to "pod ingress and egress traffic governed by NetworkPolicy."
- The reusable Kustomize base example was inconsistent with earlier manifests hard-coded to `namespace: team-alpha`. I added guidance to omit hard-coded `metadata.namespace` in reusable base manifests and added `namespace: team-alpha` to the tenant Kustomization so Kustomize applies the namespace per tenant.

## Review Notes
- The DNS and ingress-controller policies are technically valid but broad because they select whole namespaces. In production, platform teams may want to add pod selectors that match their actual DNS and ingress controller labels.
- The external egress example uses common private CIDR ranges as exclusions. Clusters with different pod, service, node, or VPC ranges should adjust the `except` list.
