# How to Fix `No Matches for Kind ServiceMonitor` During Helm or Argo CD Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, Helm, Argo CD, CRD

Description: Diagnose missing or incompatible ServiceMonitor CRDs and order GitOps installation so custom resources follow established API discovery.

---

`no matches for kind "ServiceMonitor" in version "monitoring.coreos.com/v1"` is an API discovery error. The client cannot find a served mapping for that group, version, and kind in the cluster it is contacting. It happens before the Prometheus Operator can select the ServiceMonitor or inspect its endpoint configuration.

The usual causes are a missing CRD, a CRD that has not reached `Established`, the wrong API version, the wrong cluster context, or a GitOps ordering race that submits custom resources before their CRDs are ready.

## Prove What the API Server Serves

Start with the exact context used by Helm or Argo CD, not a convenient local context:

```bash
kubectl config current-context
kubectl cluster-info
kubectl api-resources --api-group=monitoring.coreos.com
kubectl get crd servicemonitors.monitoring.coreos.com -o yaml
kubectl get --raw /apis/monitoring.coreos.com/v1
```

Interpret the results in order:

- If the CRD is `NotFound`, it is not installed in this cluster.
- If the CRD exists but `v1` is not listed with `served: true`, the manifest and installed CRD version do not agree.
- If the CRD exists and serves `v1` but discovery still fails, confirm that the deployment tool is using the same destination cluster and retry only after establishment.

Do not confuse the cluster-scoped CRD with the namespaced controller Deployment. A running `prometheus-operator` Pod does not prove that `servicemonitors.monitoring.coreos.com` was successfully registered.

## Install a Compatible CRD Set First

Prometheus Operator installation begins with its CRDs. Use one pinned Operator or kube-prometheus release as the source for the CRDs, controller, and examples. Mixing a current ServiceMonitor manifest with an old CRD can turn a discovery error into schema rejection or silent field pruning.

Current Prometheus Operator releases from v0.84.0 onward use CEL in their CRDs and require Kubernetes 1.25 or newer, or Kubernetes 1.23 with the relevant validation-expression feature gate. Check the Operator compatibility page when the cluster is older.

After applying the CRD set, wait for API registration:

```bash
kubectl wait \
  --for=condition=Established \
  crd/servicemonitors.monitoring.coreos.com \
  --timeout=120s

kubectl api-resources --api-group=monitoring.coreos.com | grep ServiceMonitor
```

When updating large Operator CRDs, client-side apply can exceed the Kubernetes annotation-size limit. The Prometheus Operator troubleshooting guide recommends server-side apply on supported Kubernetes releases:

```bash
kubectl apply --server-side --force-conflicts -f <pinned-crd-manifests>
```

Use `--force-conflicts` only for CRDs whose field ownership you have reviewed. Do not point an unattended production installation at an unpinned `latest` URL.

## Order Helm and Argo CD Reconciliation

The durable ordering is:

```text
CRDs -> wait for Established and discovery -> Operator/RBAC -> ServiceMonitor objects
```

For Helm, determine whether the chosen chart release actually owns and installs the Prometheus Operator CRDs. If another release owns them, install or upgrade that dependency first. A chart that only creates an application's ServiceMonitor cannot register the kind itself.

For Argo CD, put CRD registration in an earlier synchronization phase or a separately reconciled application, then allow the application containing ServiceMonitor objects to sync after the CRD is established. The exact Argo CD organization is a repository decision; the Kubernetes invariant is that discovery must serve the resource before a custom object can be created.

Some deployment clients build their REST mapping near the start of a run. If a single run creates both the CRD and its instances, the CRD can become established after the client has already failed to map the instances. Once the wait succeeds, rerun the failed reconciliation. Repeated retries do not fix an absent or incompatible CRD.

## Validate the Manifest Against the Live Schema

Once discovery works, use server-side dry run so the live CRD validates the object:

```bash
kubectl apply --server-side --dry-run=server -f servicemonitor.yaml
kubectl explain servicemonitor.spec --recursive
```

The canonical identity is:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
```

Do not change the API group merely to make an error disappear. Query the installed CRD's `spec.versions` and use a version with `served: true`.

After creation, a separate selection path begins. Prometheus must select the ServiceMonitor by object and namespace labels, and the ServiceMonitor must select a Kubernetes Service and its named port. Probe and ScrapeConfig are separate CRDs with separate Prometheus selectors; installing one does not make another kind available.

## A Focused Recovery Checklist

Use this sequence during an incident:

1. Confirm the destination cluster and credentials.
2. Confirm `servicemonitors.monitoring.coreos.com` exists.
3. Confirm `monitoring.coreos.com/v1` is served and the CRD is `Established`.
4. Ensure the CRD and Operator versions came from the same compatible release.
5. Render or inspect the deployment order so custom resources follow CRDs.
6. Run a server-side dry run against the live schema.
7. Retry the failed Helm or Argo CD reconciliation.
8. Only then debug Prometheus selectors, Services, ports, and targets.

This keeps API registration failures separate from normal ServiceMonitor target-discovery problems.

## Official Documentation

- [Prometheus Operator installation guide](https://prometheus-operator.dev/docs/getting-started/installation/)
- [Prometheus Operator compatibility](https://prometheus-operator.dev/docs/getting-started/compatibility/)
- [Prometheus Operator CRD update troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#customresourcedefinition--is-invalid-metadataannotations-too-long-issue)
- [Kubernetes custom resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes CustomResourceDefinition tasks](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)

## Conclusion

`No matches for kind ServiceMonitor` means the Kubernetes API mapping is unavailable, not that a scrape target is unhealthy. Install a pinned, compatible CRD set first, wait for it to become established, order GitOps resources after discovery, and validate the custom object against the live schema.
