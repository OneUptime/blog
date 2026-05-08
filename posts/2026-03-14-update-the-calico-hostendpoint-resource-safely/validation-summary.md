# Validation Summary: Safely Updating the Calico HostEndpoint Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico HostEndpoint resources
- Kubernetes
- `calicoctl`
- `kubectl`
- Kubernetes RBAC
- Calico IPAM and BGP operations

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl ipam` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico failsafe rules documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico Kubernetes RBAC examples: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API field validation behavior: https://kubernetes.io/docs/reference/using-api/api-concepts

## Issues Found
- The troubleshooting section said unknown fields are silently ignored by `kubectl`. Current Kubernetes uses server-side field validation, and the guide primarily uses `calicoctl`. Updated the advice to validate the manifest with `calicoctl validate -f hostendpoint.yaml`.
- The CRD version inspection command printed CRD names and creation timestamps, not API versions. Replaced it with a `custom-columns` command that displays `.spec.versions[*].name`.
- The RBAC check combined `kubectl auth can-i` action arguments with `--list`, which is not the documented syntax for checking a specific permission. Replaced it with specific permission checks for updating HostEndpoint and GlobalNetworkPolicy Calico CRDs, and corrected the wording to say it checks the current identity.

## Review Notes
The remaining commands and claims are consistent with the current Calico and Kubernetes documentation. Cluster namespace and label details, such as `calico-system` and `k8s-app=calico-node`, may vary by installation method, but they are valid for common Calico operator-managed installs.
