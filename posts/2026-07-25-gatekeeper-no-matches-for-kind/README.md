# Debug “No Matches for Kind” After a Gatekeeper ConstraintTemplate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, ConstraintTemplate, Rego, Troubleshooting

Description: Diagnose why a Gatekeeper Constraint kind was not created after applying its template, from discovery and status to schema and Rego errors.

---

This error usually appears when applying a Gatekeeper Constraint:

```text
no matches for kind "K8sExample" in version "constraints.gatekeeper.sh/v1beta1"
```

It means Kubernetes API discovery cannot find the requested kind at that API group and version. With Gatekeeper, a valid ConstraintTemplate causes Gatekeeper to create the corresponding Constraint custom resource definition. If that process did not finish, the Constraint cannot be accepted.

## Start with API discovery

Confirm that the kind is actually missing:

```bash
kubectl api-resources --api-group=constraints.gatekeeper.sh
kubectl get crd | grep constraints.gatekeeper.sh
```

If the kind appears, use `kubectl api-resources` to refresh the failing client's discovery cache, then retry with a new `kubectl` process. Also verify the exact API version printed by `kubectl api-resources`. Most Gatekeeper Constraints use `constraints.gatekeeper.sh/v1beta1`.

If the kind does not appear, debug the template rather than repeatedly applying the Constraint.

## Verify the template identity

The names must line up:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sexample
spec:
  crd:
    spec:
      names:
        kind: K8sExample
```

Check what is stored in the cluster:

```bash
kubectl get constrainttemplate k8sexample -o yaml
```

Common identity mistakes include:

- Applying the Constraint to `constraints.gatekeeper.sh` with a misspelled group.
- Using a Constraint `kind` that differs in capitalization or spelling.
- Copying a template but changing only `metadata.name`.
- Looking in the wrong cluster context.
- Applying the Constraint before the template controller has reconciled.

Use `kubectl config current-context` if multiple environments are in use.

## Read the ConstraintTemplate status

An accepted Kubernetes object is not necessarily an ingested Gatekeeper policy. Gatekeeper reports compilation and ingestion problems in the template's status.

```bash
kubectl get constrainttemplate k8sexample \
  -o jsonpath='{range .status.byPod[*]}{.id}{"\n"}{range .errors[*]}  {.code}{": "}{.message}{"\n"}{end}{end}'
```

You can also inspect the complete YAML:

```bash
kubectl describe constrainttemplate k8sexample
kubectl get constrainttemplate k8sexample -o yaml
```

The official debugging guide specifically recommends checking this status for Rego build errors. Fix the first compiler or schema error rather than symptoms later in the output.

## Check structural schema errors

`templates.gatekeeper.sh/v1` requires a structural OpenAPI schema. A frequent error is omitting `type: object` at the root:

```yaml
validation:
  openAPIV3Schema:
    type: object
    properties:
      allowedValues:
        type: array
        items:
          type: string
```

Also check that:

- Every array has an `items` schema.
- Nested objects declare `type: object`.
- Property types match the values in existing Constraints.
- Required fields are listed under the correct object.

Gatekeeper's validating webhook may reject an invalid structural schema when the template is applied, while controller-side ingestion or CRD-generation failures are visible in Gatekeeper status.

## Check Rego compilation

Syntax that works with one OPA or Rego version might not work in the template form you selected. Gatekeeper supports legacy `spec.targets[].rego`. Gatekeeper 3.19 and later let you opt in to Rego v1 syntax through a `code` entry with `engine: Rego` and `source.version: "v1"`.

Do not paste Rego v1-only syntax into the legacy field and assume it is enabled. Match the template format to the Gatekeeper version you run.

Inspect controller logs around the reconciliation time:

```bash
kubectl logs -n gatekeeper-system \
  -l control-plane=controller-manager \
  --since=15m --prefix | grep -i k8sexample
```

For a short diagnostic window, Gatekeeper supports `--log-level=DEBUG`, but the official guidance advises against leaving debug logging enabled in production.

## Check every Gatekeeper replica

Gatekeeper records per-pod status because each serving replica ingests policy independently. One healthy entry does not prove all replicas are ready.

```bash
kubectl get constrainttemplatepodstatus \
  -n gatekeeper-system
kubectl get pods -n gatekeeper-system -o wide
```

Look for a crash-looping, unready, or stale controller-manager Pod. If the Constraint CRD exists but one webhook replica has not loaded the template, admission behavior may vary by request until convergence.

Do not solve this by deleting a healthy generated CRD. Fix template ingestion and let Gatekeeper reconcile the desired state.

## Check Gatekeeper permissions

The Gatekeeper process that generates Constraint CRDs needs permission to create custom resource definitions. A hardened or hand-built deployment can accidentally remove it.

```bash
kubectl auth can-i create customresourcedefinitions.apiextensions.k8s.io \
  --as=system:serviceaccount:gatekeeper-system:gatekeeper-admin
```

The exact ServiceAccount name depends on the installation method. Inspect the `spec.serviceAccountName` of the Pod performing CRD generation before running the check. In a split deployment, this is the Pod running the `generate` operation; in older or combined deployments, it may be a controller-manager Pod.

Also inspect recent events:

```bash
kubectl get events -n gatekeeper-system \
  --sort-by=.metadata.creationTimestamp
```

## Use a reliable deployment sequence

A policy pipeline should make the dependency explicit:

```bash
kubectl apply -f template.yaml
kubectl wait --for=create \
  crd/k8sexample.constraints.gatekeeper.sh \
  --timeout=60s
kubectl wait --for=condition=Established \
  crd/k8sexample.constraints.gatekeeper.sh \
  --timeout=60s
kubectl apply -f constraint.yaml
```

Gatekeeper derives the generated CRD name by lowercasing `spec.crd.spec.names.kind` and appending `.constraints.gatekeeper.sh`; it does not add an `s`. Confirm the name with `kubectl get crd` rather than guessing in generic automation.

Finally, test the policy files with Gator before cluster deployment. It catches template compilation and evaluation problems earlier, although cluster reconciliation, permissions, and discovery still require cluster-side checks.

## Official documentation

- [Gatekeeper debugging](https://open-policy-agent.github.io/gatekeeper/website/docs/debug/)
- [Gatekeeper ConstraintTemplates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper operations and required permissions](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Kubernetes API discovery](https://kubernetes.io/docs/concepts/overview/kubernetes-api/#discovery-api)
