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
- The node-pool isolation example relied on `node_selector` without addressing repository-controlled `node_name`. The runner passes that field into the Pod and its policy does not clear it; Kubernetes `nodeName` bypasses the scheduler and overrides the selector. Added administrator-controlled validation or Pod-create admission rejection of explicit node names, plus an adversarial release-node selection test.

## Review Notes
- Confirmed the node-name behavior against runner commit `018c41607ac6366a59beaa9a2cf497669dc07258`: [pipeline field](https://github.com/drone-runners/drone-runner-kube/blob/018c41607ac6366a59beaa9a2cf497669dc07258/engine/resource/pipeline.go#L48), [compiler](https://github.com/drone-runners/drone-runner-kube/blob/018c41607ac6366a59beaa9a2cf497669dc07258/engine/compiler/compiler.go#L218), and [policy application](https://github.com/drone-runners/drone-runner-kube/blob/018c41607ac6366a59beaa9a2cf497669dc07258/engine/policy/policy.go#L100). The scheduling consequence follows [Kubernetes nodeName documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename). This was a source review; a live cluster isolation test was not run.

The Drone Kubernetes runner repository describes the runner as experimental, and the article appropriately advises verifying policy-match metadata and generated pods against the installed runner version. The policy schema, first-match behavior, default fallback, override precedence, and `DRONE_POLICY_FILE` setting were confirmed against the current documentation and source. The NetworkPolicy example is valid and intentionally blocks DNS and all other ingress and egress until additive allow policies are installed. NetworkPolicy enforcement still depends on the cluster networking implementation, as the post notes.
