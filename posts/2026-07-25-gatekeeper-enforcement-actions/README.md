# Gatekeeper `deny`, `warn`, and `dryrun`: Choosing an Enforcement Action

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Policy Rollout, Admission Control, Security

Description: Compare Gatekeeper deny, warn, and dryrun behavior and use a measured rollout that finds violations before policy starts blocking workloads.

---

When one action is applied across Gatekeeper enforcement points, Gatekeeper supports three standard Constraint violation actions: `deny`, `warn`, and `dryrun`. They use the same match and policy logic, but they affect an admission request differently.

Choosing among them is a rollout decision, not a measure of how important the policy is.

## Behavior at a glance

| Action | Violating request admitted? | Immediate client feedback? | Existing violations reported by audit? |
| --- | --- | --- | --- |
| `deny` | No | Yes, as an admission error | Yes |
| `warn` | Yes | Yes, as a Kubernetes warning | Yes |
| `dryrun` | Yes | No admission warning | Yes |

If `spec.enforcementAction` is omitted, Gatekeeper defaults to `deny`. Be explicit in version-controlled manifests so a missing field cannot accidentally turn an observation rollout into blocking enforcement.

## Use `dryrun` for discovery

`dryrun` evaluates matching admission requests and cluster resources during audit without changing the admission result. It is the safest starting point for a new policy on an established cluster.

This example assumes the string-list parameter schema from Gatekeeper's [basic `K8sRequiredLabels` ConstraintTemplate](https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/demo/basic/templates/k8srequiredlabels_template.yaml) is installed:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: workloads-must-have-owner
spec:
  enforcementAction: dryrun
  match:
    scope: Namespaced
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
  parameters:
    labels:
      - owner.example.com/team
```

Review both the count and examples:

```bash
kubectl get k8srequiredlabels workloads-must-have-owner \
  -o jsonpath='{.status.totalViolations}{" total\n"}'
kubectl get k8srequiredlabels workloads-must-have-owner \
  -o jsonpath='{range .status.violations[*]}{.namespace}{"/"}{.name}{": "}{.message}{"\n"}{end}'
```

Constraint status stores only a capped number of individual violations, so `totalViolations` is the better signal for rollout progress.

Use `dryrun` when you need a baseline without sending warnings to every developer or deployment controller.

## Use `warn` for visible feedback

`warn` admits the object but returns a warning through the Kubernetes API:

```yaml
spec:
  enforcementAction: warn
```

A client can see output such as:

```text
Warning: [workloads-must-have-owner] you must provide labels: {"owner.example.com/team"}
deployment.apps/api created
```

This shortens the feedback loop for interactive `kubectl` users and CI jobs while avoiding an outage. It is useful after the initial backlog is understood and the policy message is clear enough to act on.

Warnings are not a durable enforcement mechanism. Clients can suppress or fail to retain them, controllers may repeatedly submit the same invalid object, and the request still succeeds. Continue tracking audit metrics and status.

## Use `deny` for enforced invariants

`deny` rejects a violating admission request:

```yaml
spec:
  enforcementAction: deny
```

Promote only when all of these are true:

- The `match` is narrow and tested.
- Existing violations have owners and remediation plans.
- System and recovery paths have been exercised.
- The error message identifies the resource and required fix.
- The webhook availability and failure policy meet the cluster's needs.
- Exemptions are controlled and reviewed.

A denial applies only when the API server successfully calls Gatekeeper and the request matches the webhook configuration. Gatekeeper's default validation webhook failure policy is `Ignore`, so `deny` does not by itself mean fail-closed.

## A safe rollout sequence

Use a measured progression:

1. Apply the Constraint as `dryrun`.
2. Wait for a completed audit and record `totalViolations`.
3. Test allowed and disallowed objects with Gator.
4. Remediate or narrowly exempt known cases.
5. Change to `warn` and observe developer and controller behavior.
6. Promote a small namespace cohort to `deny`.
7. Expand scope while watching denials, latency, and webhook errors.

Patch the action without changing the tested policy:

```bash
kubectl patch k8srequiredlabels workloads-must-have-owner \
  --type=merge \
  -p '{"spec":{"enforcementAction":"warn"}}'
```

Then use the same operation for `deny` after the acceptance criteria pass.

## Do not confuse two kinds of dry run

Gatekeeper's `enforcementAction: dryrun` is a persistent policy mode. Kubernetes `kubectl --dry-run=server` is a request option that asks the API server not to persist an individual request.

Server-side dry run is valuable for testing live `warn` or `deny` admission behavior without persisting the candidate:

```bash
kubectl apply --dry-run=server -f candidate-deployment.yaml
```

When the Constraint uses `dryrun`, however, the request is admitted without a warning, so this command alone does not reveal a violation. Use Gator for candidate assertions, or enable Gatekeeper's `--log-denies` flag and inspect the admission logs.

It does not replace audit or a `dryrun` rollout because it evaluates only the candidate requests you send.

## Keep policy messages actionable

All three actions benefit from precise messages. Include the failed requirement, relevant value, and expected value. Avoid exposing secrets or dumping the full AdmissionReview.

A useful message is:

```text
container "api" uses "docker.io/example/api:latest"; use an approved registry and immutable digest
```

A weak message is:

```text
policy violation
```

Good messages make the `warn` phase useful and reduce the support cost when the policy reaches `deny`.

## Official documentation

- [Gatekeeper handling Constraint violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper failing closed](https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/)
- [Kubernetes admission warnings](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#response)
