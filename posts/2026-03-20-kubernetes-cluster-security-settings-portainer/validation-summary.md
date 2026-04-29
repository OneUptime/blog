# Validation Summary: How to Configure Kubernetes Cluster Security Settings in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes RBAC
- Pod Security Admission and Pod Security Standards
- OPA Gatekeeper

## Sources Consulted
- Portainer documentation: Kubernetes cluster setup https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer documentation: Kubernetes security constraints https://docs.portainer.io/user/kubernetes/cluster/security
- Portainer documentation: Manage access to a namespace https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer documentation: Kubernetes roles and bindings https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Kubernetes documentation: Pod Security Admission https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes documentation: Enforce Pod Security Standards with namespace labels https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: PodSecurityPolicy removal https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- Kubernetes documentation: Using RBAC Authorization https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Gatekeeper documentation: How to use Gatekeeper https://open-policy-agent.github.io/gatekeeper/website/docs/v3.16.x/howto/
- Gatekeeper Library documentation: Privileged Container https://open-policy-agent.github.io/gatekeeper-library/website/validation/privileged-containers/

## Issues Found
- The Portainer navigation path was inaccurate. I changed `Cluster > Security` to `Cluster > Security constraints` and clarified that `Cluster > Setup` and `Cluster > Security constraints` are separate areas in the UI.
- The post listed `Allow Users to Use External IPs for Services` and `Enable Node Selector for Workloads` as Portainer cluster security settings. I replaced them with documented Portainer options: `Only Allow Admins to Deploy Ingresses` and `Restrict Secret Contents Access for Non-Admins (UI Only)`.
- The Pod Security Standards section implied Portainer's workload restrictions are configured through Kubernetes Pod Security Standards. I clarified that Portainer's `Security constraints` use OPA Gatekeeper, while native Kubernetes v1.25+ uses Pod Security Admission with namespace labels after PodSecurityPolicy removal.
- The namespace label examples reused the same namespace without `--overwrite`, which can fail when relabeling. I changed the commands to use `--overwrite` and separate example namespaces.
- The RBAC section described the example as custom roles for Portainer-managed teams. I reworded it to describe standard Kubernetes roles and bindings that Portainer can build on when Kubernetes RBAC is enabled.
- The privileged container section incorrectly suggested NetworkPolicy could prevent privileged containers. I corrected it to Pod Security Admission or Gatekeeper and noted that Gatekeeper requires the matching `ConstraintTemplate` before the `Constraint`.

## Review Notes
- Portainer's `Security constraints` documentation still describes its workload controls as Gatekeeper-based constraints derived from historical PodSecurityPolicy semantics, even though upstream Kubernetes removed PodSecurityPolicy in v1.25. The post now distinguishes Portainer's Gatekeeper-based controls from native Pod Security Admission.
- `kubectl` was not installed in the local workspace, so command verification was performed against official Kubernetes and Gatekeeper documentation rather than local CLI help output.
