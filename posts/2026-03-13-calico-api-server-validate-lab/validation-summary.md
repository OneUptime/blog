# Validation Summary: How to Validate the Calico API Server in a Lab Cluster

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico Open Source / Enterprise
- Calico aggregated API server
- Kubernetes aggregated APIService
- Kubernetes RBAC
- kubectl
- calicoctl
- Calico NetworkPolicy and GlobalNetworkPolicy resources

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs, https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Component architecture, https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico source manifest for v3.32.0 API server deployment, https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/apiserver.yaml
- Calico source API types for NetworkPolicy and GlobalNetworkPolicy, https://github.com/projectcalico/calico/tree/v3.32.0/api/pkg/apis/projectcalico/v3
- Kubernetes kubectl reference: kubectl auth can-i, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post assumed the Calico API server was always in the `calico-system` namespace. Current Calico manifest installs place it in `calico-apiserver`, while operator-managed installs commonly use `calico-system`. Updated the commands to use a `CALICO_APISERVER_NAMESPACE` variable and documented both values.
- The post described Open Source API server usage without noting that the aggregated `calico-apiserver` is deprecated in current Calico documentation. Updated the prerequisite wording to identify it as the deprecated aggregated API server.
- The invalid action example omitted `Log` from the list of valid Calico rule actions. Updated the comment to list `Allow`, `Deny`, `Log`, and `Pass`.
- The API server failure resilience test referenced an undefined `deny-test-server.yaml`, did not wait for test pods to become ready, and restored the API server to a hard-coded replica count of 2. Replaced the external file reference with an inline Calico `NetworkPolicy`, added readiness waits, and restored the original deployment replica count.

## Review Notes
- The aggregated Calico API server is deprecated and will be removed in a future release; new Calico installations should consider native v3 CRDs where appropriate.
- The resilience test validates enforcement of an already-applied policy. Creating or changing `projectcalico.org/v3` resources through the aggregated API server is expected to fail while the API server deployment is scaled to zero.
