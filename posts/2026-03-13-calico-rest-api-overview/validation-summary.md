# Validation Summary: How to Understand the Calico REST API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico API server
- Kubernetes API aggregation and native v3 CRDs
- Kubernetes authentication and RBAC
- kubectl
- curl
- jq

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Enable native v3 CRDs - https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes documentation: Kubernetes API concepts - https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes documentation: kubectl create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes documentation: Access Clusters Using the Kubernetes API - https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/

## Issues Found
- The introduction incorrectly implied that the REST API is the foundation that `calicoctl` uses under the hood. Calico documentation describes `calicoctl` as a client for the Calico datastore, while the Calico API server exposes the same `projectcalico.org/v3` API semantics through Kubernetes. Updated the wording to avoid implying that `calicoctl` depends on the API server.
- The post stated that the Calico REST API is exposed through the Kubernetes API aggregation layer as an absolute statement. Current Calico documentation notes that the aggregated `calico-apiserver` is deprecated and that native v3 CRDs can serve `projectcalico.org/v3` resources directly without the aggregation API server. Updated the API structure and conclusion wording to cover both cases.
- The kubeconfig example was labeled generically as a kubeconfig token. Updated the heading to "kubeconfig bearer token" because the JSONPath only works for kubeconfig users that actually contain a bearer token, not client-certificate or exec-plugin based users.
- The sample GlobalNetworkPolicy selector used `test == true`. Calico labels are string values and official examples quote selector string values. Updated it to `test == 'true'`.

## Review Notes
- The REST paths, `kubectl get --raw` discovery command, service account token command, `kubectl proxy` workflow, HTTP verbs, and listed common Calico resource endpoints are consistent with Kubernetes and Calico documentation.
- Calico's aggregated API server is currently documented as deprecated in favor of native v3 CRDs for new installations. The post now mentions this caveat, but a future update could expand on migration and version-specific behavior.
