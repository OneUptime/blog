# How to Apply a Gatekeeper Policy Only to One ServiceAccount or Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, ServiceAccount, Workloads, Policy Scope

Description: Scope Gatekeeper policy to a workload label, assigned Pod ServiceAccount, or requesting identity without confusing these different signals.

---

"Only this ServiceAccount" can mean two different things in Kubernetes:

- Only Pods configured to run as that ServiceAccount.
- Only API requests authenticated as that ServiceAccount.

Those are different signals. A Pod's assigned identity is stored in `spec.serviceAccountName`. The actor that submitted an admission request is stored in `input.review.userInfo.username`. Choose the one that represents the security requirement.

## Scope one workload with labels

Gatekeeper Constraint matching supports object labels. For a Deployment, put a stable policy label on both the parent and its Pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: production
  labels:
    policy.example.com/profile: payments-restricted
spec:
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
        policy.example.com/profile: payments-restricted
    spec:
      serviceAccountName: payments-api
      containers:
        - name: api
          image: registry.example.com/payments/api@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Then narrow the Constraint:

```yaml
spec:
  match:
    scope: Namespaced
    namespaces:
      - production
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    labelSelector:
      matchLabels:
        policy.example.com/profile: payments-restricted
```

All top-level matchers must match. The policy applies only to Pods in `production` with that label.

Do not rely on a label for a security boundary if the workload owner can remove it. Protect the label with RBAC, validate that selected controllers include it in `spec.template.metadata.labels`, or scope by an object field that the policy itself examines.

## Scope by the Pod's assigned ServiceAccount

The standard Constraint `match` fields do not select `spec.serviceAccountName`. Add the check to the ConstraintTemplate policy and make the target ServiceAccount a parameter.

The relevant Rego pattern is:

```rego
target_service_account {
  configured := object.get(input.review.object.spec, "serviceAccountName", "default")
  configured == input.parameters.serviceAccountName
}

violation[{"msg": msg}] {
  target_service_account
  # The actual policy condition follows.
  not input.review.object.spec.securityContext.runAsNonRoot
  msg := sprintf(
    "Pods using ServiceAccount %q must set runAsNonRoot",
    [input.parameters.serviceAccountName],
  )
}
```

Declare the parameter in the template's structural schema:

```yaml
openAPIV3Schema:
  type: object
  properties:
    serviceAccountName:
      type: string
  required:
    - serviceAccountName
```

Then instantiate it:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sServiceAccountPodSecurity
metadata:
  name: payments-serviceaccount-security
spec:
  enforcementAction: warn
  match:
    scope: Namespaced
    namespaces:
      - production
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    serviceAccountName: payments-api
```

Kubernetes defaults an omitted Pod ServiceAccount to `default`, so the policy fragment uses the same fallback.

This approach is auditable because the assigned ServiceAccount remains part of the stored Pod.

## Scope by the requesting ServiceAccount

For an actor-specific admission rule, compare the authenticated username:

```rego
request_from_target_service_account {
  input.review.userInfo.username ==
    "system:serviceaccount:ci:manifest-deployer"
}
```

Kubernetes ServiceAccount usernames use this form:

```text
system:serviceaccount:<namespace>:<name>
```

Use actor identity for rules such as "the CI deployer may create only resources carrying a provenance annotation." Do not use it to infer which ServiceAccount a Pod will run as.

Actor-dependent policies have a major limitation: Gatekeeper audit cannot reconstruct `userInfo` for an existing object. The official input documentation marks `userInfo`, `operation`, `uid`, and `dryRun` as unavailable during audit. Handle absent fields explicitly and rely on admission logs or Kubernetes audit logs for historical actor evidence.

## Understand controller-created objects

Creating a Deployment and creating its Pods are separate admission requests:

```text
human or CI -> creates Deployment
Deployment controller -> creates ReplicaSet
ReplicaSet controller -> creates Pod
```

The Pod request's `userInfo` represents the controller, not the human who created the Deployment. If the intent concerns the workload's assigned identity, inspect `spec.serviceAccountName`. If it concerns the original deployment actor, validate the Deployment request or use trusted provenance attached by the delivery system.

A Pod-only Constraint can reject Pods while allowing the parent Deployment. The Deployment then remains present with a rollout failure. To give feedback earlier, validate the controller kind directly or use Gatekeeper workload expansion, with awareness of expansion's documented limitations.

## Prefer stable selectors

For a single named Deployment, `match.name` is available:

```yaml
spec:
  match:
    namespaces: ["production"]
    name: payments-api
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
```

Do not use a generated Pod name for stable scoping. ReplicaSet hashes and Pod suffixes change. Labels, namespace boundaries, and assigned ServiceAccounts are more durable.

Test positive and negative cases before enforcement:

```bash
kubectl apply --dry-run=server -f payments-api.yaml
kubectl apply --dry-run=server -f unrelated-api.yaml
gator test -f policies/ -f test-resources/
```

Include a test that omits `serviceAccountName`, one that uses `default`, and one that uses the target account.

## Official documentation

- [Gatekeeper Constraint match fields](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Gatekeeper admission review input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Kubernetes ServiceAccount identities](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#service-account-tokens)
- [Gatekeeper workload resources](https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/)
