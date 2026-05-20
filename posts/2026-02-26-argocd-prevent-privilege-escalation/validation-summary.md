# Validation Summary: How to Prevent Privilege Escalation in ArgoCD

## Status
validated

## Post Type
Security guide

## Technologies Covered
- Argo CD AppProjects
- Argo CD RBAC
- Argo CD sync options
- Argo CD Config Management Plugins
- Kubernetes RBAC
- Kubernetes Pod Security Standards
- Kyverno ClusterPolicy
- kubectl
- argocd CLI

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Config Management Plugins: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD app create command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Pod Security policy examples: https://kyverno.io/policies/pod-security/

## Issues Found
- The Mermaid escalation diagram said a `ClusterRole` with `cluster-admin` grants full access. A `ClusterRoleBinding` is the resource that binds a subject to that role, so the diagram now refers to `ClusterRoleBinding`.
- The Kyverno example used the deprecated top-level `spec.validationFailureAction`. Updated the policy to use per-rule `validate.failureAction: Enforce`.
- The Kyverno privileged container and host namespace rules required fields to be present instead of allowing safe unset values. Updated the patterns to use Kyverno equality anchors for optional fields and added init and ephemeral container coverage.
- The Kyverno example mixed `allowPrivilegeEscalation` into the privileged-container rule. Split it into a dedicated `deny-privilege-escalation` rule matching the Pod Security Restricted control.
- The Argo CD `Validate=true` section implied manifest validation is a security control. Clarified that it is Kubernetes schema validation and not a security policy engine.
- The Config Management Plugin example omitted the requirement to mount the plugin config into the repo-server sidecar. Added the required mount path note.
- The monitoring commands used `deployment/argocd-application-controller`, but the standard Argo CD application controller runs as a StatefulSet. Updated the commands to `statefulset/argocd-application-controller`.

## Review Notes
The AppProject examples, destination/source repository restrictions, RBAC policy syntax, Pod Security namespace labels, and `argocd app create` flags are consistent with current official documentation. The log examples assume Argo CD emits JSON logs; deployments using text log format should use text filtering or configure JSON logging before piping to `jq`.
