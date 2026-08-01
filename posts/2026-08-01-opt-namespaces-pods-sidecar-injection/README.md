# How to Opt Specific Namespaces and Pods In or Out of Sidecar Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, Admission Webhooks, Istio, Labels

Description: Control automatic sidecar injection safely with namespace selectors, Pod-template labels, explicit exceptions, revision labels, and verification of newly admitted Pods.

---

Automatic sidecar injection is an admission-time decision. A mutating webhook sees a new Pod request, evaluates its matching rules and labels, and may return a patch that adds containers, volumes, and configuration.

That yields two rules that prevent most surprises:

1. label the **namespace** or the workload's **Pod template**, depending on the desired scope;
2. recreate the Pods after changing injection policy, because existing Pods are not modified retroactively.

The exact label keys and precedence rules belong to the injector product. This guide uses Istio's documented labels as a concrete example and also shows the generic Kubernetes controls behind them.

## Choose an Opt-In or Opt-Out Default

An opt-in model injects only explicitly selected workloads. It is safer during rollout and for heterogeneous clusters:

```bash
kubectl label namespace shop istio-injection=enabled --overwrite
```

With Istio's default policy, namespaces with no enabling label are generally not injected. New Pods in `shop` are candidates for injection.

An opt-out model injects broadly unless a namespace or Pod says no. It reduces the chance of accidentally leaving an application outside the mesh, but raises the blast radius of webhook or proxy changes. If you operate that model, explicitly exclude system, injector, batch, and compatibility namespaces according to the product's installation guidance.

Do not rewrite a vendor-managed `MutatingWebhookConfiguration` by hand merely to change routine membership. The operator or Helm release may overwrite it, and an incorrect selector can affect cluster-wide Pod creation.

## Label the Pod Template, Not Just the Deployment

Admission evaluates the Pod object. Labels on `Deployment.metadata` are not automatically labels on its Pods. Put a per-Pod decision under `spec.template.metadata.labels`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: settlement
  namespace: shop
spec:
  selector:
    matchLabels:
      app: settlement
  template:
    metadata:
      labels:
        app: settlement
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: app
          image: example.com/settlement@sha256:REPLACE_ME
```

Istio documents `sidecar.istio.io/inject: "false"` on the Pod as an explicit opt-out. Use a string value in YAML and apply it to the template rather than patching each generated Pod.

To force injection for one Pod in an eligible policy setup:

```yaml
spec:
  template:
    metadata:
      labels:
        sidecar.istio.io/inject: "true"
```

Whether that force works when the namespace is explicitly disabled depends on product precedence. For current Istio behavior, any relevant disabled label wins; do not rely on a Pod `true` to override a namespace explicitly labeled `istio-injection=disabled`.

## Use Revision Labels During Control-Plane Upgrades

Istio revisions let a namespace select a particular control-plane revision:

```bash
kubectl label namespace shop istio-injection- --overwrite
kubectl label namespace shop istio.io/rev=canary --overwrite
```

The trailing `-` removes the old `istio-injection` label. Istio documents that if both `istio-injection` and `istio.io/rev` are present on a namespace, `istio-injection` takes precedence. Leaving both behind can silently defeat the planned revision migration.

List the relevant labels before a rollout:

```bash
kubectl get namespace shop --show-labels
kubectl get namespace -L istio-injection -L istio.io/rev
```

Revision tags and labels are versioned Istio features; follow the documentation for the installed release rather than copying a command from a different control-plane generation.

## Understand the Generic Webhook Selectors

A `MutatingWebhookConfiguration` can limit calls with:

- `namespaceSelector`, which evaluates namespace labels for namespaced resources;
- `objectSelector`, which evaluates labels on the admitted object;
- `rules`, which select operations, API groups, versions, and resources;
- `matchConditions`, which add CEL expressions for finer filtering.

Inspect, but normally do not hand-edit, the installed configuration:

```bash
kubectl get mutatingwebhookconfigurations
kubectl get mutatingwebhookconfiguration <injector-name> -o yaml
```

Kubernetes warns that object selectors are only appropriate when users cannot bypass policy by choosing labels themselves. A sidecar membership label is often intentionally user-controlled; a security invariant should be checked separately with admission validation and RBAC.

Keep the webhook from intercepting its own critical Pods and avoid broad matching of system workloads. Kubernetes' webhook guidance recommends narrow scopes and staged rollout through a test namespace.

## Roll the Workload After a Policy Change

Changing labels on a namespace affects later admission requests only. Existing Pods keep whatever containers they already have.

Trigger a controlled replacement through the owning workload:

```bash
kubectl rollout restart deployment/settlement -n shop
kubectl rollout status deployment/settlement -n shop
```

For Jobs, CronJobs, StatefulSets, and custom controllers, use their lifecycle semantics rather than deleting Pods blindly. Consider disruption budgets, persistent volumes, ordered updates, and at-most-once work.

## Verify the Result on the Pod

Check the admitted Pod, not only the source template:

```bash
kubectl get pods -n shop -l app=settlement
kubectl get pod -n shop <pod-name> \
  -o jsonpath='{.spec.containers[*].name}{"\n"}'
kubectl get pod -n shop <pod-name> --show-labels
```

For Istio, `istioctl analyze`, injector logs, and the product's injection check commands can explain why a Pod was or was not selected. Also check Events when Pod creation fails; the absence of a Pod can indicate the admission call failed under `failurePolicy: Fail`.

## Establish Guardrails

- manage namespace and Pod-template labels declaratively;
- restrict who can change cluster-scoped webhook configurations;
- test opt-in, opt-out, revision, Job, and system-namespace cases;
- validate that workloads requiring a sidecar cannot start without one;
- alert on admission errors and unexpectedly uninjected Pods;
- document exceptions with an owner and expiry condition;
- review injection again after Kubernetes or injector upgrades.

Labels are a convenient membership interface, but the admitted Pod is the source of truth for what actually runs.

## Official Documentation

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: Labels and Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)
