# Validation Summary: How to Apply Resource Quotas in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- ResourceQuota
- LimitRange
- `kubectl`
- Portainer API proxy
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer: Manage a namespace https://docs.portainer.io/user/kubernetes/namespaces/manage
- Portainer: Add a new namespace https://docs.portainer.io/user/kubernetes/namespaces/add
- Portainer: kubectl shell https://docs.portainer.io/user/kubernetes/kubectl
- Portainer: Kubeconfig https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Portainer: Accessing the Portainer API https://docs.portainer.io/api/access
- Portainer: Roles https://docs.portainer.io/sts/admin/user/roles
- Portainer API documentation / OpenAPI spec https://docs.portainer.io/api/docs and https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Kubernetes: Resource Quotas https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: Limit Ranges https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes: Configure Memory and CPU Quotas for a Namespace https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/
- Kubernetes: Limit Storage Consumption https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- Kubernetes: kubectl run https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The intro overstated Portainer's UI coverage. Current Portainer docs show namespace UI controls for CPU/memory resource assignment, while broader `ResourceQuota` controls are still handled through Kubernetes manifests or API proxy access. I corrected the wording to distinguish UI-managed CPU/memory quotas from the broader Kubernetes `ResourceQuota` feature set.
- The prerequisites said "namespace-admin access", which does not match current Portainer role naming. I changed this to require Portainer admin access or a role with permission to manage the target namespace.
- The Portainer UI instructions used the wrong control label and action wording. Current docs use the `Resource assignment` toggle and `Update namespace` / `Create namespace`, so I corrected those labels.
- Step 2 referred to "KubeShell", while current Portainer documentation calls this feature `kubectl shell`. I updated the section title and command note.
- The LimitRange explanation was too broad. Kubernetes only requires pods to specify requests or limits when quotas cover compute resources such as CPU or memory. I corrected that sentence.
- The API examples used a generic bearer token without showing the JWT flow. Portainer's API access docs explicitly document access tokens with the `X-API-Key` header, so I switched the examples to that documented authentication method.
- The quota-enforcement example said a deployment exceeded quota, but the command created pods directly and referenced an undefined shell variable. I changed the wording to "workload" and replaced the example with a working loop that reaches the pod-count limit.
- The namespace templating script assumed integer CPU values and `Gi` memory values but did not validate them, which could break shell arithmetic. I added `set -euo pipefail`, argument validation, and safer memory arithmetic.

## Review Notes
- Verified against current Portainer 2.39/2.40 documentation and current Kubernetes documentation as of April 24, 2026. Portainer UI labels can differ slightly across older releases, but the corrected labels and flow match the current docs.
