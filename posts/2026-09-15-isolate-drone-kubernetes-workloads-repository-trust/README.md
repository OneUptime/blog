# How to Isolate Drone Kubernetes Runner Workloads by Repository and Trust Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Kubernetes, Security, Networking, CI/CD

Description: Separate Drone Kubernetes builds by trusted event paths, repository policy, workload identity, network access, and cache ownership.

Repository names alone do not establish the trust level of a build. A pull request against a private repository may contain external code, while a reviewed push to its protected branch can follow a different trust process. Isolation should consider the event as well as the repository.

Use administrator-owned runner policies to select the workload namespace and identity, then apply Kubernetes controls to the actual pods. Repository-authored runner labels are useful routing preferences, but they should not be the sole authorization check for a privileged execution pool.

## Put untrusted execution on the default path

This runner policy sends only protected-branch push events for one repository to a release namespace. All other events use the untrusted namespace:

```yaml
kind: policy
name: reviewed-main
match:
  repo:
    - acme/api
  event:
    - push
  branch:
    - main
metadata:
  namespace: ci-release
service_account: ci-release-build
node_selector:
  ci.example.com/pool: release
resources:
  request:
    cpu: 2000
    memory: 2GiB
  limit:
    cpu: 2000
    memory: 2GiB

---
kind: policy
name: default
metadata:
  namespace: ci-untrusted
service_account: ci-untrusted-build
node_selector:
  ci.example.com/pool: untrusted
resources:
  request:
    cpu: 1000
    memory: 1GiB
  limit:
    cpu: 1000
    memory: 1GiB
```

Create the namespaces, accounts, and matching node labels before testing. Mount the policy and configure `DRONE_POLICY_FILE` on the runner. Policies use first-match selection, so keep the catch-all last and make every policy complete. See [Drone runner policies](https://docs.drone.io/runner/kubernetes/configuration/policies/).

The policy's `node_selector` alone does not enforce node isolation. The runner accepts repository-controlled `node_name`, copies it into the Pod, and leaves it intact when applying the selector policy. Kubernetes [`nodeName` bypasses the scheduler and overrides `nodeSelector`](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename). Before treating separate node pools as a trust boundary, reject nonempty `node_name` through administrator-controlled server validation, or reject nonempty `spec.nodeName` when Drone build Pods are created through Kubernetes admission. Verify this behavior against the [pinned runner compiler](https://github.com/drone-runners/drone-runner-kube/blob/018c41607ac6366a59beaa9a2cf497669dc07258/engine/compiler/compiler.go) and your deployed revision.

The runner's [compiler](https://github.com/drone-runners/drone-runner-kube/blob/master/engine/compiler/compiler.go) supplies repository, event, and target-branch metadata to policy matching. This example relies on those fields; verify them against your installed runner. Do not invent a `trust_level` selector and assume the runner enforces it.

A push to `main` is trusted only if the Git provider prevents unauthorized direct pushes and requires the reviews you expect. Tag releases need a separate policy because a tag event has no reliable source-branch association. Unrecognized events should remain on the restrictive path.

## Limit the workload's actual capabilities

Create a workload service account for untrusted builds with no application RoleBindings and disable automatic service-account token mounting where supported by the effective pod configuration. Keep runner-controller credentials separate from build credentials.

A namespace is a useful policy boundary, but it does not isolate networking by itself. Start with a default-deny policy in the untrusted namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: ci-untrusted
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Add narrowly scoped allow rules for your cluster DNS, source host, dependency proxy, and test destinations. The default-deny example intentionally blocks those until the allow rules exist. Kubernetes [NetworkPolicy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/) explains that enforcement depends on a supporting network plugin and that policies are additive.

If dependencies live on changing public IP ranges, use a controlled egress proxy or internal mirror rather than assuming a plain NetworkPolicy can filter arbitrary DNS names. Check cloud metadata access and node-level endpoints separately in your cluster's networking implementation.

## Keep storage and credentials separated

Use separate cache namespaces or buckets for untrusted and release jobs. A trusted build should not execute a cached binary or script that an untrusted job can replace. Apply the same rule to intermediate artifacts and shared persistent volumes.

Do not provide registry write tokens or deployment credentials to the untrusted namespace. Avoid privileged containers, host paths, and host sockets there. Kubernetes [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) can help enforce these restrictions; test the runner's generated pods against the chosen standard before enabling enforcement.

For stronger separation, use distinct runner deployments with namespace-scoped controller identities, separate nodes, or separate clusters. Their selection rules must still be enforced by administrator-controlled configuration and admission checks. Merely naming a runner “trusted” does not stop repository YAML from requesting it.

## Test both intended routing and attempted escape

Run a pull request, a push to a feature branch, and a reviewed push to `main`. Inspect the namespace, service account, node placement, token mounts, and network access for each. Then attempt to request the release namespace and account from the pull request configuration; the policy and cluster controls should prevent that override. Also submit `node_name` naming a release node from an untrusted pipeline and require rejection before the Pod starts. Confirm ordinary builds still schedule through the enforced selector.

Record these tests alongside the policy version. Re-run them whenever runner images, Git provider permissions, secret integrations, or Kubernetes admission rules change. Isolation is the observed behavior of all those controls together, not just a successful policy-file deployment.
