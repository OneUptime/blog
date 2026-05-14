# Validation Summary: How to Explain the Calico REST API to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes API
- Kubernetes API aggregation
- Kubernetes native CRDs
- Kubernetes RBAC
- Kubernetes service account tokens
- kubectl
- curl
- jq

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Enable native v3 CRDs - https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico documentation: Network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: API aggregation layer - https://kubernetes.io/docs/concepts/api-extension/apiserver-aggregation/
- Kubernetes documentation: Configure the aggregation layer - https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/
- Kubernetes documentation: Kubernetes API concepts, watches, and dry-run - https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes kubectl reference: create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes kubectl reference: create role - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/
- Kubernetes kubectl reference: create rolebinding - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_rolebinding/

## Issues Found
- The post said the Calico REST API is "just the Kubernetes API server" and "not a separate service." Current Calico documentation describes the default Calico API server as an aggregated API server, while native v3 CRDs can expose `projectcalico.org/v3` resources without the aggregated API server. Updated the wording to say clients access Calico resources through the Kubernetes API endpoint, with resources served either by the aggregated Calico API server or by native v3 CRDs depending on installation mode.
- The prerequisites and FAQ incorrectly implied that the Calico API server is always required for `projectcalico.org/v3` REST access. Updated both to account for native v3 CRD mode, where the aggregated API server is not required.
- The RBAC setup example created a `RoleBinding` to a `ClusterRole` named `calico-policy-manager` without defining that role. Updated the example to create a namespaced `Role` for `networkpolicies.projectcalico.org` and bind that role in the `production` namespace.
- The API stability answer made a broad guarantee about stability across the Calico 3.x lifecycle and breaking changes only at major versions. Reworded it to state that `projectcalico.org/v3` is versioned and that teams should review Calico release notes and API changes during upgrades.
- The conclusion repeated the inaccurate "same server" framing. Updated it to the more precise Kubernetes API endpoint and client auth/RBAC framing.

## Review Notes
- Calico's aggregated `calico-apiserver` is deprecated in current Calico documentation and will be removed in a future release; native v3 CRDs are recommended for new installations.
- The watch and `dryRun=All` examples match Kubernetes API behavior. In production controllers, a full list/watch implementation should also handle `resourceVersion`, reconnection, pagination, and watch expiration.
- The `curl -k` examples are common for demonstrations, but production automation should validate the Kubernetes API server certificate instead of disabling TLS verification.
