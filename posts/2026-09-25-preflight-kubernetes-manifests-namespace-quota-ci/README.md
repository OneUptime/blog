# How to Preflight Kubernetes Manifests Against Remaining Namespace Quota in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, CI/CD, kubectl

Description: Combine server dry-run, representative Pod admission, and an aggregate rollout budget to catch quota failures before deployment.

---

A Deployment can pass server dry-run even though its ReplicaSet will later fail to create Pods because of namespace quota. The dry-run request evaluates the Deployment object; it does not run the controller and create its future replicas.

A useful CI preflight separates API validation, Pod admission, and aggregate demand. None of these checks reserves quota for the subsequent deployment.

## Render once and capture the target environment

Run the checks with the intended namespace, cluster context, and deployment identity. Kubernetes uses the same authorization rules for dry-run and real requests, so a CI identity with only read access may not be able to perform a server dry-run.

For Kustomize, an example collection step is:

```bash
set -euo pipefail
namespace=payments
kubectl config current-context > target-context.txt
kubectl kustomize overlays/production > rendered.yaml
kubectl -n "$namespace" get resourcequota -o json > quotas.json
kubectl -n "$namespace" get limitrange -o json > limitranges.json
kubectl -n "$namespace" get pods -o json > existing-pods.json
kubectl -n "$namespace" apply --dry-run=server -f rendered.yaml
```

Use the same rendered artifact later, and record its hash and collection time. Keep artifacts containing Secrets restricted. A failed inventory request must fail the preflight; an empty output file must not become an assumed zero-use namespace.

The [API documentation](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run) explains admission, defaulting, webhook compatibility, and the absence of persistent side effects. A webhook that cannot support dry-run is a preflight limitation to resolve, not a reason to bypass the check silently.

## Probe a representative Pod creation

For an ordinary Deployment stored as `deployment.json`, extract its Pod template into a dry-run creation request:

```bash
jq --arg ns "$namespace" '{
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    generateName: "quota-preflight-",
    namespace: $ns,
    labels: (.spec.template.metadata.labels // {}),
    annotations: (.spec.template.metadata.annotations // {})
  },
  spec: .spec.template.spec
}' deployment.json > candidate-pod.json

kubectl create --dry-run=server -f candidate-pod.json -o json > admitted-pod.json
```

This invokes admission for a Pod creation. Kubernetes' [quota evaluator](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apiserver/pkg/admission/plugin/resourcequota/controller.go) checks the request but avoids updating quota usage for a dry run. Inspect the returned Pod for defaults and injected containers before calculating its cost.

This probe is representative, not identical to controller creation. The caller, owner references, generated labels, and admission rules can differ. If a webhook depends on controller identity or ownership, account for that explicitly or rehearse the complete controller flow in an isolated environment. StatefulSet claim templates and custom operators also require workload-specific handling.

## Calculate the whole transition

Ten successful single-Pod probes do not prove ten Pods fit together. Because each dry run leaves usage unchanged, every probe can see the same remaining budget.

For each quota and resource, evaluate:

```text
projected peak = current accounted usage
               + additional simultaneously admitted demand
               + explicit operating margin
```

During a Deployment rollout, current usage already includes old Pods. Add the new Pods that can overlap; do not add the entire existing deployment again. Conversely, do not subtract old Pods before they have actually terminated and the quota accounting reflects the release.

Suppose quota allows ten CPU, observed usage is eight CPU, and each new Pod requests one CPU. Three separate dry runs may succeed individually, while the third real concurrent creation exceeds the ceiling. An aggregate check must flag the eleven-CPU peak.

The [Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) covers surge behavior and terminating overlap. Include HPA maximum scale, concurrent Jobs, and each resource key constrained by the applicable [ResourceQuotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/).

Use a Kubernetes Quantity-aware implementation. Compare CPU in a consistent unit and memory in bytes; preserve unknown values as unknown. Account for init containers, sidecars, overhead, defaults, and every matching scope. If the calculator cannot model a construct, report it as unsupported rather than granting a false pass.

## Make the gate useful without promising a reservation

Emit a per-quota report containing the hard value, observed use, planned additional peak, margin, result, and data timestamp. Block on a negative balance, unreadable inventory, or unsupported critical accounting. Route a scoped exception through the deployment's normal owner rather than mutating quota automatically.

Serialize competing releases where practical and repeat the snapshot near deployment time. Another controller can consume resources after CI passes, and the API server remains authoritative. A quota preflight also says nothing about whether the admitted Pod can be scheduled given node resources, volume topology, and node taints and Pod tolerations.

Test the calculator with a multi-replica overflow, injected sidecar, overlapping scopes, stale or missing status, and mixed quantity units. The desired result is an early, explainable refusal when the planned transition cannot fit, followed by normal admission and health monitoring during deployment.
