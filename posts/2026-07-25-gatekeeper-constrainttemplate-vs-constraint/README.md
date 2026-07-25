# ConstraintTemplate vs Constraint in Gatekeeper: Why Do You Need Both?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, ConstraintTemplate, Rego, Policy as Code

Description: Understand how a ConstraintTemplate defines reusable policy while a Constraint scopes and configures one deployment of that policy.

---

Gatekeeper splits validation policy into two Kubernetes resources on purpose. A `ConstraintTemplate` is the reusable policy definition. A Constraint is an instance of that definition with concrete scope, parameters, and enforcement.

An accurate mental model is:

```text
ConstraintTemplate = function plus argument schema
Constraint         = function call plus resource selector
```

You need both because policy authors and cluster administrators usually own different decisions.

## What a ConstraintTemplate defines

A ConstraintTemplate defines:

- The new Constraint `kind`.
- The OpenAPI schema for `spec.parameters`.
- The Rego or CEL logic that emits violations.
- The Gatekeeper target that supplies Kubernetes admission input.

Here is a small template that requires one configurable label:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredteam
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredTeam
      validation:
        openAPIV3Schema:
          type: object
          properties:
            label:
              type: string
          required:
            - label
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredteam

        violation[{"msg": msg}] {
          required := input.parameters.label
          labels := object.get(input.review.object.metadata, "labels", {})
          not labels[required]
          msg := sprintf("required label %q is missing", [required])
        }
```

With `templates.gatekeeper.sh/v1`, the parameter schema must be structural. In practice, that means declaring `type` at every schema level that needs it. The API server can then reject a Constraint whose parameters have the wrong shape before Gatekeeper evaluates it.

The template does not decide which namespaces are production or whether a violation should currently block admission. Those are deployment choices.

## What a Constraint defines

Once Gatekeeper successfully ingests the template, it creates a custom resource definition for the named kind. An administrator can then create one or more `K8sRequiredTeam` Constraints:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredTeam
metadata:
  name: production-must-have-team
spec:
  enforcementAction: warn
  match:
    scope: Namespaced
    namespaces:
      - production
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
  parameters:
    label: owner.example.com/team
```

This object supplies three things:

- `match` selects the Kubernetes resources to evaluate.
- `parameters` provides values validated by the template schema.
- `enforcementAction` controls whether violations deny, warn, or run without affecting admission.

The same template can support another Constraint with a different namespace, label, or enforcement action. Gatekeeper evaluates every matching Constraint, so overlapping instances can produce multiple violations.

## Why one combined resource would be limiting

Separating definition from configuration brings several operational benefits:

- A platform team can review policy code once and let cluster owners configure it.
- A library template can be reused across clusters without editing its Rego.
- Parameters receive Kubernetes API validation.
- Enforcement can progress from `dryrun` to `warn` to `deny` without changing policy code.
- Different scopes can use the same tested implementation.

This also reduces the temptation to hard-code namespace names, registry hosts, or organization-specific labels inside Rego.

## Apply them in the right order

Always apply the template first and wait for successful ingestion:

```bash
kubectl apply -f template.yaml
kubectl get constrainttemplate k8srequiredteam -o yaml
kubectl api-resources --api-group=constraints.gatekeeper.sh
```

Only then apply the Constraint:

```bash
kubectl apply -f constraint.yaml
kubectl get k8srequiredteam production-must-have-team -o yaml
```

If the generated Constraint kind is not discoverable, applying the Constraint produces a `no matches for kind` error. The usual cause is a template compilation or schema error, not a missing Constraint file.

In a multi-replica deployment, inspect the template's `status.byPod` entries. All serving replicas should have observed the same generation before you rely on enforcement.

## Keep responsibilities in the correct resource

Put these in the ConstraintTemplate:

- Violation logic.
- Safe handling of missing fields.
- The parameter contract.
- Reusable helper code.

Put these in a Constraint:

- Namespaces, kinds, labels, names, and scope.
- Organization-specific allowed values.
- Rollout enforcement.
- A clear instance name that describes the policy intent.

Avoid copying a template just to change one allowed registry or required label. Add an appropriate parameter instead. Conversely, avoid making parameters so powerful that a Constraint author can inject arbitrary Rego or disable essential checks.

## Updating and removing policy safely

Treat a template update like an API and policy-code release:

1. Test the new template and representative Constraints with Gator.
2. Keep parameter schema changes backward compatible where possible.
3. Apply the template and wait for every replica to ingest it.
4. Review audit and admission behavior before increasing enforcement.

Before deleting a template, inventory its Constraint instances:

```bash
kubectl get constraints
kubectl get k8srequiredteam -A
```

Removing policy resources can eliminate protection immediately. Manage them through version control and use the same review process as application code.

## Official documentation

- [How to use Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/)
- [Gatekeeper ConstraintTemplates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Kubernetes structural schema requirements](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#specifying-a-structural-schema)

