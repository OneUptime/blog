# Validation Summary: How to Enforce Kubernetes Namespace, Service Account, and Resource Policies for Drone Builds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone Kubernetes runner
- Kubernetes policies and RBAC
- Kubernetes ServiceAccounts
- Kubernetes ResourceQuota
- `kubectl`
- YAML

## Sources Consulted
- Drone Kubernetes runner policy documentation: https://docs.drone.io/runner/kubernetes/configuration/policies/
- Drone `DRONE_POLICY_FILE` reference: https://docs.drone.io/runner/kubernetes/configuration/reference/drone-policy-file/
- Drone Kubernetes runner resource documentation: https://docs.drone.io/runner/kubernetes/configuration/resources/
- Drone Kubernetes runner policy implementation: https://github.com/drone-runners/drone-runner-kube/blob/master/engine/policy/policy.go
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes RBAC good practices: https://kubernetes.io/docs/concepts/security/rbac-good-practices/

## Issues Found
No technical issues found.

## Review Notes
The Drone policy syntax and behavior were checked against the current documentation and the runner's implementation on its default branch. The policy `resources.request` values describe an aggregate pipeline-pod request that the runner distributes among containers, while `resources.limit` is applied per container, as stated in the post. The Kubernetes API objects use stable `v1` APIs, and the `kubectl` inspection commands are valid. Because the source-code link targets the mutable `master` branch and the post does not pin a runner release, policy behavior should be rechecked when upgrading the Drone Kubernetes runner.
