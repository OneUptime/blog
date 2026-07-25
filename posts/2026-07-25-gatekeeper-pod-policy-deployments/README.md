# Why a Gatekeeper Pod Policy Does Not Block Violating Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Deployments, Pods, Admission Control

Description: Learn why Pod constraints allow a Deployment object, what happens when its controller creates Pods, and how to validate workload templates earlier.

---

A Kubernetes Deployment does not contain a Pod at its top level. It contains a Pod template that a chain of controllers later turns into Pods.

That lifecycle explains why a Gatekeeper Constraint matching only `Pod` can allow a violating Deployment:

```text
user creates Deployment
        |
        v
Deployment controller creates ReplicaSet
        |
        v
ReplicaSet controller creates Pod
        |
        v
Pod Constraint evaluates here
```

The Deployment request never matched the Pod Constraint.

## What the user sees

Consider this match:

```yaml
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

Kubernetes stores the Deployment. When the ReplicaSet controller submits a Pod, Gatekeeper rejects the Pod. The Deployment remains, but it never reaches its desired availability.

Inspect the parent and its events:

```bash
kubectl get deployment insecure-api
kubectl describe deployment insecure-api
kubectl get replicaset -l app=insecure-api
kubectl get events --sort-by=.metadata.creationTimestamp
```

The denial may appear in a ReplicaSet or Deployment condition rather than in the original `kubectl apply` response. This is a poor developer experience even though the Pod policy ultimately prevents the workload from running.

## Option 1: validate controller templates directly

Write a policy for each workload shape you support. A Deployment's containers are under:

```text
input.review.object.spec.template.spec.containers
```

A Pod's containers are under:

```text
input.review.object.spec.containers
```

You can normalize these paths in reusable Rego helpers or use a policy template designed for workload resources. Match the relevant groups:

```yaml
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds:
          - Deployment
          - StatefulSet
          - DaemonSet
      - apiGroups: ["batch"]
        kinds:
          - Job
```

This gives immediate feedback on the parent request. It also requires deliberate support for each schema. CronJobs, Jobs, and custom operators can nest Pod templates differently.

Keep the Pod Constraint too. Direct Pod creation and controllers not covered by the parent policy still need protection.

## Option 2: use Gatekeeper workload expansion

Gatekeeper's `ExpansionTemplate` feature creates a temporary expanded Pod from a workload's Pod template and evaluates Pod Constraints against it. In current Gatekeeper, workload expansion is beta and enabled by default, though the resource API remains `v1alpha1`.

```yaml
apiVersion: expansion.gatekeeper.sh/v1alpha1
kind: ExpansionTemplate
metadata:
  name: expand-common-workloads
spec:
  applyTo:
    - groups: ["apps"]
      versions: ["v1"]
      kinds:
        - Deployment
        - StatefulSet
        - DaemonSet
        - ReplicaSet
    - groups: ["batch"]
      versions: ["v1"]
      kinds:
        - Job
  templateSource: spec.template
  generatedGVK:
    group: ""
    version: v1
    kind: Pod
```

With this installed, a Pod Constraint can evaluate the expanded Pod while the Deployment or Job is in admission. Audit also expands configured workload resources.

Test the behavior before production:

```bash
gator expand \
  --filename=expansion.yaml \
  --filename=deployment.yaml
gator test \
  --filename=policies/ \
  --filename=expansion.yaml \
  --filename=deployment.yaml
```

## Understand expansion limitations

An expanded Pod is a prediction, not the final controller-created object. Gatekeeper documents several limitations:

- Generated Pod names and other controller fields are not predictable.
- A later mutating webhook may inject sidecars or change fields.
- Request identity differs between the parent request and eventual Pod request.
- Custom controllers may apply logic not represented in `spec.template`.
- An inaccurate expansion can over-enforce or under-enforce.

Gatekeeper mutators can model predictable changes on generated resources. Use `match.source: Generated` when a mutator should affect only expanded objects, not real admission requests.

Even with expansion, retain enforcement on actual Pods. The final Pod request is the authoritative object after controller and mutation behavior.

## Control original and generated matching

Constraint matching supports `source`:

- `Original` matches real admission objects only.
- `Generated` matches expanded resources only.
- `All` matches both.

Use this to avoid duplicate messages or to stage expansion separately. For example, you can warn on generated Pods while continuing to deny invalid original Pods.

An `ExpansionTemplate` can also set an enforcement action override for its expanded resources. Use that during initial rollout so a false positive in the prediction does not block every parent workload.

## Do not confuse ServiceAccounts

The Deployment request may come from a human or CI ServiceAccount. The eventual Pod request comes from a Kubernetes controller. A policy based on `input.review.userInfo` therefore sees different actors.

If the rule concerns the identity assigned to the Pod, check `spec.serviceAccountName` in the template. If it concerns who may deploy, validate the parent request and account for audit's inability to reconstruct user information.

## A practical rollout

1. Keep the existing Pod Constraint in `deny`.
2. Add parent-aware validation or an ExpansionTemplate in `dryrun` or `warn`.
3. Test Deployments, StatefulSets, DaemonSets, Jobs, and custom workloads.
4. Include injected sidecars and defaulted fields in the test environment.
5. Compare expanded output with real created Pods.
6. Promote parent validation only after false positives are resolved.

The goal is both strong enforcement and feedback at the object developers actually submit.

## Official documentation

- [Gatekeeper working with workload resources](https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/)
- [Gatekeeper workload expansion](https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/)
- [Gatekeeper Gator expansion testing](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/#the-gator-expand-subcommand)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

