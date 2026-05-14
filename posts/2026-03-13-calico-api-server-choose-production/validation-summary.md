# Validation Summary: How to Choose the Right Calico API Server Configuration for Production

## Status
validated

## Post Type
Tutorial / Production configuration guide

## Technologies Covered
- Calico Open Source
- Tigera operator
- Calico API server
- Kubernetes aggregated APIs
- Kubernetes RBAC
- kubectl
- Kubernetes audit logging

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Configure resource requests and limits - https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico documentation: Resource definitions - https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Operator troubleshooting checklist - https://docs.tigera.io/calico-cloud/get-started/operator-checklist
- Kubernetes documentation: RBAC authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes documentation: kubectl api-resources - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes documentation: kubectl logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction described the Calico API server as exposing resources as "native Kubernetes API extensions." Updated this to clarify that the Calico API server is an aggregated API server. Current Calico docs distinguish this from native `projectcalico.org/v3` CRDs.
- The post implied default operator settings may run a single replica. Current Calico operator docs state `Installation.spec.controlPlaneReplicas` defaults to 2 for HA-capable control plane components. Reworded this into a review-the-defaults caveat and added the current deprecation note for the aggregated `calico-apiserver`.
- The Step 2 YAML set `spec.apiServerDeployment.spec.replicas`, but the current `APIServerDeploymentSpec` does not expose a `replicas` field. Replaced it with `Installation.spec.controlPlaneReplicas: 2`, which is the documented operator field for control plane replicas.
- The APIServer resource-limit example configured only `calico-apiserver`. Updated it to also include `tigera-queryserver`, matching the documented APIServerDeployment container names used in Calico resource configuration examples.
- The commands used the `calico-apiserver` namespace for an operator-managed installation. Updated operator-based deployment, pod, and log commands to use `calico-system`, which is the namespace used by current operator documentation.
- The validation step claimed to test "creating and reading" a resource but only ran a read command with `calicoctl`. Replaced it with a `kubectl get networkpolicies.projectcalico.org --all-namespaces` read test so it validates access through the Kubernetes API server.
- The prerequisites required `calicoctl`, but the corrected validation path uses `kubectl` through the Calico API server. Removed the unused `calicoctl` prerequisite.
- The log command was described as checking whether audit logs were enabled. Kubernetes audit logging is configured on the Kubernetes API server, not verified by reading Calico API server container logs. Updated the command description to review Calico API server logs for errors.

## Review Notes
- The aggregated `calico-apiserver` is deprecated in current Calico documentation. The post is still technically relevant for existing clusters that use it, but future revisions should consider making native `projectcalico.org/v3` CRDs the primary recommendation for new installations.
