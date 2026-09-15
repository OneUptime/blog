# Validation Summary: How to Isolate Drone Kubernetes Runner Workloads by Repository and Trust Level

## Status
validated

## Post Type
Security and configuration guide

## Technologies Covered
- Drone Kubernetes runner
- Kubernetes namespaces, service accounts, and RBAC
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Standards
- CI/CD workload isolation, caches, credentials, and runner pools

## Sources Consulted
- Drone Kubernetes runner policy documentation: https://docs.drone.io/runner/kubernetes/configuration/policies/
- Drone Kubernetes runner resource documentation: https://docs.drone.io/runner/kubernetes/configuration/resources/
- Drone Kubernetes runner compiler source: https://github.com/drone-runners/drone-runner-kube/blob/master/engine/compiler/compiler.go
- Drone Kubernetes runner policy matching and application source: https://github.com/drone-runners/drone-runner-kube/tree/master/engine/policy
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes service account documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes service-account token mounting documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes security checklist: https://kubernetes.io/docs/concepts/security/security-checklist/

## Issues Found
No technical issues found.

## Review Notes
The Drone Kubernetes runner repository describes the runner as experimental, and the article appropriately advises verifying policy-match metadata and generated pods against the installed runner version. The policy schema, first-match behavior, default fallback, override precedence, and `DRONE_POLICY_FILE` setting were confirmed against the current documentation and source. The NetworkPolicy example is valid and intentionally blocks DNS and all other ingress and egress until additive allow policies are installed. NetworkPolicy enforcement still depends on the cluster networking implementation, as the post notes.
