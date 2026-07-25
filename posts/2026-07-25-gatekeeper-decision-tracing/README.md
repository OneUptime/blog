# How to Trace a Gatekeeper Decision and Debug Unexpected Rego Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Rego, Kubernetes, Debugging, Policy as Code

Description: Trace one Gatekeeper admission decision safely, inspect its input and policy state, and reproduce surprising Rego behavior with Gator.

---

Unexpected Gatekeeper results usually come from one of four layers:

- The Constraint did not match the object.
- The AdmissionReview shape differed from the assumed input.
- Rego became undefined because a field was absent.
- A replica had different policy or synchronized data.

Gatekeeper can log a targeted OPA trace and, optionally, a data dump. Scope it tightly because full tracing is expensive and may expose sensitive policy input.

## Eliminate configuration errors first

Before tracing evaluation, check template and Constraint ingestion:

```bash
kubectl get constrainttemplate <template-name> -o yaml
kubectl get <constraint-kind> <constraint-name> -o yaml
kubectl get constrainttemplatepodstatus,constraintpodstatus \
  -n gatekeeper-system
```

Confirm every Gatekeeper replica observed the current generation and has no compilation errors.

Then compare the stored object with every `match` field:

```bash
kubectl get <kind> <name> -n <namespace> -o yaml
```

Check group, kind, scope, namespace, labels, namespace labels, name, and source. A policy cannot emit a violation for an object its Constraint never selects.

## Reproduce the exact AdmissionReview

Gatekeeper policy reads `input.review`, not the original YAML file. Kubernetes may default fields, convert API versions, and supply request metadata.

Important fields include:

- `object` and `oldObject`
- `operation`
- `namespace`
- `namespaceObject`
- `userInfo`
- `dryRun`

Audit cannot populate `userInfo`, `operation`, `uid`, or `dryRun`. A decision that depends on them must be reproduced as admission, not inferred from audit.

For controller-created resources, trace the controller ServiceAccount rather than the human who created the parent workload.

## Configure one targeted trace

Tracing is configured in the singleton Gatekeeper `Config` in `gatekeeper-system`. Preserve its existing sync and exclusion settings when adding this section:

```yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  validation:
    traces:
      - user: system:serviceaccount:ci:manifest-deployer
        kind:
          group: apps
          version: v1
          kind: Deployment
```

The user field is required. Use the exact authenticated username. Make the kind as specific as possible.

Do not replace the entire Config with this example. Export and review the current object first:

```bash
kubectl get config.config.gatekeeper.sh config \
  -n gatekeeper-system -o yaml
```

Trigger one representative request:

```bash
kubectl apply --dry-run=server -f unexpected-deployment.yaml
```

Trace output is written to the stdout logs of the Gatekeeper controller Pod that handled the request:

```bash
kubectl logs -n gatekeeper-system \
  -l control-plane=controller-manager \
  --since=5m --prefix
```

If the trace is absent, confirm the request identity, GVK after API conversion, and which Pod received the request.

## Use data dumps sparingly

Gatekeeper supports:

```yaml
dump: All
```

on a trace entry. This includes the state available to policy evaluation and can be large. It may contain metadata or full content from synchronized resources, including sensitive data if those kinds were replicated.

Start without a dump. Add `dump: All` only in a controlled environment or short incident window with protected log access. Remove the trace immediately after collecting the needed request.

Broad tracing can increase memory, log volume, and webhook latency enough to cause timeouts. The official debugging documentation deliberately requires both user and kind selectors.

## Read Rego undefined behavior carefully

Rego rules do not automatically return `false` when an expression references a missing path. A rule body can become undefined and produce no violation.

This fragile expression assumes labels exist:

```rego
owner := input.review.object.metadata.labels["owner"]
owner == ""
```

Use a default:

```rego
labels := object.get(input.review.object.metadata, "labels", {})
owner := object.get(labels, "owner", "")
owner == ""
```

Also check:

- Arrays that may be absent, such as `initContainers`.
- Pod paths versus Deployment template paths.
- String case and whitespace.
- Set versus array comparisons.
- Multiple `violation` rules producing duplicate messages.
- Rego v0 versus explicitly enabled Rego v1 syntax.
- `input.parameters` type and default assumptions.

The trace shows which expressions entered, failed, or produced a result. Work backward from the expected `violation` rule.

## Reproduce locally with Gator

Create a Gator Suite with the same template, Constraint, and object:

```yaml
apiVersion: test.gatekeeper.sh/v1alpha1
kind: Suite
tests:
  - name: unexpected-decision
    template: template.yaml
    constraint: constraint.yaml
    cases:
      - name: reproduces-object
        object: admission-review.yaml
        assertions:
          - violations: 1
```

Use an AdmissionReview fixture when the rule reads `userInfo`, operation, or old object. Supply `inventory` files for referential rules.

```bash
gator verify suite.yaml
```

If Gator and the cluster differ, compare:

- Gatekeeper and Gator versions.
- The exact applied template and Constraint.
- Mutations and API defaults.
- Synchronized inventory.
- AdmissionReview identity and operation.
- Per-replica ingestion state.

## Use debug logging only for a bounded window

Gatekeeper supports `--log-level=DEBUG`; the default is `INFO`. Official guidance says not to leave DEBUG enabled in production.

Prefer the targeted trace. If debug logging is still necessary, estimate log volume, change it through the deployment source, record the start time, reproduce once, and revert.

After diagnosis, delete only the `spec.validation.traces` entries you added while preserving the rest of the Config.

## Official documentation

- [Gatekeeper debugging and tracing](https://open-policy-agent.github.io/gatekeeper/website/docs/debug/)
- [Gatekeeper admission review input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper ConstraintTemplate variables](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/#built-in-variables-across-all-engines)
- [Gator metadata-based tests](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/#validating-metadata-based-constraint-templates)

