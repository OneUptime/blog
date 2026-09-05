# Istio Injects Its Own Control Plane and Breaks the Webhook: Recover from a Mislabelled `istio-system` Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar Injection, Admission Webhook, Control Plane, Recovery, Troubleshooting

Description: Recover when an accidental injection label mutates Istiod itself, breaks admission, and prevents clean control-plane replacement.

---

The Istio system namespace is not an ordinary application namespace. The stock Istiod chart explicitly disables injection on its Pod template, so an accidental namespace label alone should not inject Istiod. If that opt-out has been removed or overridden, or a custom injector ignores it, newly created control-plane Pods in an injection-enabled namespace can receive an `istio-proxy` container and traffic-capture setup intended for workloads. The resulting Istiod may fail readiness, call through an unexpected proxy path, or never become a ready endpoint for the injector that created it.

This can form a bootstrap loop:

```text
new Istiod Pod creation
  -> Istio injector webhook
  -> existing Istiod endpoint
  -> injected control-plane Pod
  -> control-plane or webhook fails
  -> no healthy injector for the next Pod
```

Recovery must first stop future control-plane injection, then create a verified clean Istiod replica while preserving any working endpoint. Deleting every Istiod Pod first makes the dependency loop harder to break.

## Confirm Accidental Injection Instead of Guessing

Capture namespace labels, injector configurations, and the actual Pod shape:

```bash
kubectl get namespace istio-system --show-labels
kubectl get namespace istio-system -o yaml
kubectl get mutatingwebhookconfigurations \
  -o custom-columns='NAME:.metadata.name,WEBHOOKS:.webhooks[*].name'

kubectl -n istio-system get pods -l app=istiod -o json |
  jq '.items[] |
      {name: .metadata.name,
       created: .metadata.creationTimestamp,
       containers: [.spec.containers[].name],
       initContainers: [.spec.initContainers[]?.name],
       sidecarStatus: .metadata.annotations["sidecar.istio.io/status"],
       revisionLabel: .metadata.labels["istio.io/rev"],
       actualRevision: .metadata.annotations["istio.io/rev"]}'
```

Strong evidence includes an `istio-proxy` container on Istiod, an `istio-init` or native proxy init container, and a `sidecar.istio.io/status` annotation. Do not infer injection from the number of containers alone; control-plane charts can include legitimate helpers.

Compare older, healthy Istiod Pods with newly created failures. Injection happens when a Pod is admitted, so an accidental namespace label does not retrofit existing Pods. Pods from the same ReplicaSet can therefore differ if replacements were admitted under different namespace labels.

Inspect the owning Deployment's Pod template too:

```bash
kubectl -n istio-system get deployment istiod -o json |
  jq '{labels: .spec.template.metadata.labels,
       annotations: .spec.template.metadata.annotations,
       containers: [.spec.template.spec.containers[].name]}'
```

The stock Istiod chart places `sidecar.istio.io/inject: "false"` on the control-plane template. If the resulting Pods are still injected, identify which revisioned webhook matched and whether the opt-out was overridden or a custom mutating webhook added the proxy. Custom selectors can cause a webhook call, but the standard injector also checks the Pod opt-out before mutating it.

## Preserve a Working Recovery Anchor

Before changing anything, list webhook endpoints and their readiness conditions, along with controller health. In revisioned installations, use the Deployment and the Service referenced by the affected webhook's `clientConfig.service` throughout these commands:

```bash
kubectl -n istio-system get service istiod -o yaml
kubectl -n istio-system get endpointslice \
  -l kubernetes.io/service-name=istiod -o yaml
kubectl -n istio-system get deployment istiod
kubectl -n istio-system get pods -l app=istiod -o wide
```

If at least one un-injected Istiod Pod is ready, keep it running until a clean replacement is ready. Pause unrelated upgrades and autoscaling actions through the platform's approved change process so a controller does not remove the last good endpoint.

Export the small set of declarative objects needed for rollback, taking care that generated output can contain public certificates and environment-specific data:

```bash
kubectl get namespace istio-system -o yaml > /tmp/istio-system-namespace.yaml
kubectl -n istio-system get deployment,service istiod -o yaml \
  > /tmp/istiod-workload.yaml
kubectl get mutatingwebhookconfiguration -o yaml \
  > /tmp/mutating-webhooks.yaml
```

Store these incident artifacts securely and delete them under the retention policy. Do not export Secrets as a convenience backup.

## Stop Future Injection in the System Namespace

Istio's documented injection policy treats an explicit disabled legacy label as an opt-out. This guard also disables injection-dependent gateways or other workloads on their next creation, so inventory those workloads before applying it:

```bash
kubectl label namespace istio-system \
  istio-injection=disabled --overwrite
```

Read the object back and make sure the expected manager did not immediately overwrite it:

```bash
kubectl get namespace istio-system --show-labels
kubectl get namespace istio-system --show-managed-fields -o yaml
```

If `istio.io/rev` was accidentally added to the system namespace, remove it only after confirming it is not intentionally used by a gateway or another installed component:

```bash
kubectl label namespace istio-system istio.io/rev-
```

The trailing hyphen removes the label. Record its previous value first. In a carefully revisioned design, a system namespace label can be intentional for selected workloads, and gateways are better placed in dedicated namespaces. Do not apply this command from a generic runbook without inventorying those workloads.

Also keep a Pod-level opt-out in the Istiod Deployment template through the owning Helm, `istioctl`, or GitOps configuration:

```yaml
spec:
  template:
    metadata:
      labels:
        sidecar.istio.io/inject: "false"
```

Use the label form supported by current Istio injection policy. Make the change in source control or installation values; a direct Deployment patch may be reverted by the installer.

## Prove the Webhook Will Skip Istiod Before Restarting It

Render the intended control plane or obtain the live Deployment, then use server-side dry run under the corrected namespace labels. Inspect whether the dry-run Pod contains a proxy. Extract the intended Deployment's `.spec.template` into a `v1` Pod manifest, preserving its labels, annotations, and spec, and give it a unique name that does not already exist. A dry run of the Deployment itself does not admit its future Pods:

```bash
kubectl -n istio-system create --dry-run=server -f istiod-recovery-pod.yaml -o json |
  jq '{containers: [.spec.containers[].name],
       initContainers: [.spec.initContainers[]?.name],
       sidecarStatus: .metadata.annotations["sidecar.istio.io/status"]}'
```

Do not submit a hand-built Istiod Pod as the recovery workload; use the supported installer-rendered template. The dry-run check verifies the resulting Pod mutation, not runtime health or that no webhook was called. A skipped or failed-open webhook can also return an unmodified Pod; confirm selector exclusions as well. A clean result has no injected `istio-proxy`, `istio-init`, or sidecar status annotation unless your supported control-plane architecture explicitly requires one.

Inspect the matching webhook's selectors if it still injects:

```bash
kubectl get mutatingwebhookconfiguration INJECTOR_NAME -o yaml
```

Replace the placeholder with the MutatingWebhookConfiguration name from the earlier inventory. Successful dry-run Pod output does not identify the webhook; map a webhook name from an error to its containing configuration, or use API-server mutation audit annotations when available. Check both namespace and object selectors. Restore the webhook from the same Istio revision's installer output rather than inventing a selector that might exclude application namespaces.

If the webhook is unreachable and `failurePolicy: Fail` blocks even an explicitly opted-out Pod, use the organization's break-glass admission procedure. The safest change is the narrowest one that makes the system namespace not match. Changing the whole injector to `Ignore` can admit application Pods without proxies across the cluster and must include detection and recreation of every bypassed Pod.

## Create One Clean Istiod Replica

Once dry run shows that Istiod will not be injected, reconcile the Deployment through its owner. Use `RollingUpdate` with `maxUnavailable: 0`, a positive `maxSurge`, and enough capacity to preserve available replicas during replacement. A restart rolls all replicas, so if manual verification must precede removal of any existing replica, stage a clean replica through the installation owner first. If template reconciliation already started a rollout, omit the redundant restart. Then watch the rollout:

```bash
kubectl -n istio-system rollout restart deployment/istiod
kubectl -n istio-system rollout status deployment/istiod --timeout=5m
kubectl -n istio-system get pods -l app=istiod -w
```

In a multi-revision installation, use the exact revision-labelled Deployment rather than the generic example. If capacity, quota, or `maxSurge` prevent a safe additional replica, adjust them through an approved, reversible change before terminating a good Pod. PodDisruptionBudgets do not constrain Deployment rolling updates or direct Pod deletion.

Verify the new Pod shape and endpoints:

```bash
kubectl -n istio-system get pod ISTIOD_NEW_POD -o json |
  jq '{containers: [.spec.containers[].name],
       initContainers: [.spec.initContainers[]?.name],
       ready: [.status.containerStatuses[]? | {name, ready}],
       initReady: [.status.initContainerStatuses[]? | {name, ready}],
       conditions: .status.conditions}'

kubectl -n istio-system get endpointslice \
  -l kubernetes.io/service-name=istiod -o yaml
```

Confirm the webhook port is serving, control-plane readiness is healthy, and the clean Pod appears as a ready EndpointSlice address before removing an injected replica.

## Repair Admission and Data-Plane Convergence

Check Istiod logs for webhook certificate, informer, and xDS errors:

```bash
kubectl -n istio-system logs ISTIOD_NEW_POD \
  -c discovery --since=20m --timestamps
```

The container name can differ; read it from the Pod first. Verify the Istiod Service maps webhook port `443` to the deployed serving port, commonly `15017`, and xDS port `15012` to ready endpoints. Confirm injector CA bundles match the CA that signs the webhook serving certificate; restore the revision's supported CA reconciliation if they are empty or stale.

Use a harmless server-side dry-run application Pod in a dedicated test namespace labelled for the intended revision. It should now receive exactly one proxy. Then create a real canary and verify:

```bash
istioctl proxy-status
istioctl analyze --all-namespaces
```

Inventory Pods created during the incident. Any application Pod intended for sidecar mode that was admitted without its proxy must be treated as outside the sidecar mesh even if its namespace is labelled. Ambient-mode workloads do not require sidecars. Detect missing sidecars by inspecting `sidecar.istio.io/status` and container names in both `containers` and `initContainers`, quarantine it if policy requires, and recreate it through its owner after admission is healthy.

## Prevent the Namespace from Being Relabelled Again

Put the explicit system-namespace policy in GitOps and restrict who can mutate namespace labels. Add admission policy that denies enabling injection on protected namespaces while allowing the exact labels required by supported Istio installation workflows. Test the policy against upgrades and revisions before enforcement.

Monitor for:

- `istio-proxy` or `sidecar.istio.io/status` on Istiod Pods;
- changes to `istio-injection` and `istio.io/rev` on protected namespaces;
- injector webhook timeouts and CA drift;
- Istiod Service ready-endpoint count; and
- application Pods intended for sidecar mode without a proxy in either `containers` or `initContainers`.

Separating gateways into their own revision-labelled namespaces reduces pressure to label `istio-system` broadly and makes the control-plane exclusion easier to reason about.

## Conclusion

Accidental injection of Istiod is a dependency-loop incident. Preserve any working un-injected endpoint, explicitly stop future injection in the system namespace, prove the webhook's selection with server-side dry run, and let the supported installer create one clean control-plane replica. Only after its webhook and xDS endpoints are ready should injected replicas be retired and application Pods created during the gap be reconciled.

## Official Documentation

- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)
- [Istio: Namespace Multiple Injection Labels](https://istio.io/latest/docs/reference/config/analysis/ist0123/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
