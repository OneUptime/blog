# Gatekeeper Mutation vs Validation: What Happens When Both Target the Same Field?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Mutation, Validation, Admission Control

Description: Understand admission ordering when Gatekeeper mutates and validates the same field, and design a safe default-then-enforce policy pair.

---

Kubernetes completes mutating admission before it runs validating admission. Gatekeeper validation therefore evaluates the final object produced by the mutation phase, not necessarily the object originally submitted.

This makes "default, then enforce" possible:

```text
submitted object
  -> all matching mutating admission
  -> final mutated object
  -> all matching validating admission
  -> stored object
```

It does not guarantee that one mutating webhook runs before another.

## Gatekeeper uses different policy resources

Gatekeeper mutation uses:

- `AssignMetadata`
- `Assign`
- `ModifySet`
- `AssignImage`

Validation uses a `ConstraintTemplate` and one or more Constraints.

`enforcementAction` belongs to Constraints. It does not put a mutator in dry-run or warning mode. Test mutators with server-side dry run before applying them broadly. `gator expand` applies mutators only when testing an `ExpansionTemplate` pipeline.

## Example: add a default label, then require its value

An `AssignMetadata` can add a label when it is absent:

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: default-security-tier
spec:
  match:
    scope: Namespaced
    namespaces:
      - production
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  location: metadata.labels.security-tier
  parameters:
    assign:
      value: restricted
```

Gatekeeper limits `AssignMetadata` to adding labels and annotations. It does not overwrite a pre-existing value. A validation Constraint should therefore reject an existing disallowed value as well as confirm the defaulted value.

Conceptually:

```rego
labels := object.get(input.review.object.metadata, "labels", {})
object.get(labels, "security-tier", "") != "restricted"
```

When both resources match:

- Missing label: mutation adds `restricted`; validation sees it and allows.
- Label already `restricted`: mutation leaves it; validation allows.
- Label set to `privileged`: mutation does not overwrite it; validation denies.

This preserves explicit user intent for review instead of silently replacing it.

## Do not rely on mutating webhook order

Kubernetes documents that mutating webhooks do not have a stable invocation order. Another webhook can modify the same field after Gatekeeper or cause reinvocation.

Validation runs only after the mutation phase completes, so it is the correct place to enforce the final invariant. If two mutators disagree, the request may oscillate, become invalid, or depend on reinvocation behavior.

Avoid multiple owners for one field. Document ownership and narrow each mutator's match.

## Make mutation idempotent

Running the mutation again should not keep changing the object. Gatekeeper mutators are designed around declarative assignment and set operations, but configuration still matters.

Use:

- `Assign` for one field outside metadata.
- `AssignMetadata` for adding one label or annotation.
- `ModifySet` for set-like list merge or prune.
- `AssignImage` for image domain, path, or tag components.
- `pathTests` to require a parent or avoid replacing an existing path.

For example, require a container to exist before assigning one of its fields:

```yaml
parameters:
  pathTests:
    - subPath: "spec.containers[name: api]"
      condition: MustExist
    - subPath: "spec.containers[name: api].imagePullPolicy"
      condition: MustNotExist
  assign:
    value: Always
```

For mutators other than `AssignMetadata`, `applyTo` declares exact groups, versions, and kinds. It helps Gatekeeper reason about object schema and does not accept globs.

## Account for operation scope

Gatekeeper's mutation webhook currently processes `CREATE` and `UPDATE`. In Gatekeeper v3.23 and later, `applyTo.operations` can select either or both for mutators that use `applyTo`:

```yaml
applyTo:
  - groups: [""]
    versions: ["v1"]
    kinds: ["Pod"]
    operations: ["CREATE", "UPDATE"]
```

`AssignMetadata` has no `applyTo` field, so it cannot use this operation selector.

If the field should remain enforced on later updates, do not mutate only on create without considering lifecycle effects.

Existing objects are not retroactively changed when a mutator is installed. They change only on a matching future admission operation. Audit validation can report their stored state, but mutation itself is not a remediation scan.

## Plan for mutation failure

If mutation is unavailable and its webhook fails open, validation can still enforce the final state:

```text
mutation succeeds -> default is added -> validation allows
mutation skipped  -> required field absent -> validation denies
```

This protects the invariant but turns mutation downtime into admission failures for objects relying on the default. Monitor mutation latency and availability separately from validation.

If validation also fails open, neither layer guarantees the field. Audit can detect stored violations later but cannot undo their effects.

## Test the combined pipeline

Test four cases:

- Field absent.
- Field already has the desired value.
- Field has a conflicting value.
- Another mutator changes the field.

Use Gator to test the validating Constraint against fixtures that represent the final object:

```bash
gator test \
  --filename=template.yaml \
  --filename=constraint.yaml \
  --filename=expected-mutated-object.yaml
```

Gator evaluates validation policy locally; it does not reproduce the API server's complete mutating-webhook sequence for an ordinary admission request. Exercise the real interaction with server-side dry-run in a non-production cluster:

```bash
kubectl apply --dry-run=server -f object-without-label.yaml
kubectl apply --dry-run=server -f object-with-disallowed-label.yaml
```

Finally, use `kubectl apply --dry-run=server` in a staging cluster. Only the API server test includes other installed webhooks, defaulting, conversion, and real ordering.

## Official documentation

- [Gatekeeper mutation](https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/)
- [Gatekeeper validation and mutation overview](https://open-policy-agent.github.io/gatekeeper/website/docs/#validation-and-mutation)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
