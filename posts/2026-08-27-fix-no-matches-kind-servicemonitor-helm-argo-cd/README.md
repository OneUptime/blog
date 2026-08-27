# Fix Missing ServiceMonitor CRDs in Helm or Argo CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, Helm, Argo CD, CRD

Description: Diagnose missing or incompatible ServiceMonitor CRDs and order GitOps installation so custom resources follow established API discovery.

---

`no matches for kind "ServiceMonitor" in version "monitoring.coreos.com/v1"` is an API discovery error. The client cannot find a served mapping for that group, version, and kind in the cluster it is contacting. It happens before the Prometheus Operator can select the ServiceMonitor or inspect its endpoint configuration.

The usual causes are a missing CRD, a CRD that has not reached `Established`, the wrong API version, the wrong cluster context, or a GitOps ordering race that submits custom resources before their CRDs are ready.

## Prove What the API Server Serves

For Helm, use the same kubeconfig and context as the release operation. For Argo CD, inspect the Application's `spec.destination` and run these checks against the same destination cluster; Argo CD uses its configured cluster credentials rather than your local context:

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

Current Prometheus Operator releases from v0.84.0 onward use CEL in their CRDs and require Kubernetes 1.25 or newer; Kubernetes 1.23–1.24 can be used with the `CustomResourceValidationExpressions` feature gate enabled. Check the Operator compatibility page when the cluster is older.

After applying the CRD set, wait for API registration:

```bash
kubectl wait \
  --for=condition=Established \
  crd/servicemonitors.monitoring.coreos.com \
  --timeout=120s

kubectl api-resources --api-group=monitoring.coreos.com | grep ServiceMonitor
```

When updating large Operator CRDs, client-side apply can exceed the Kubernetes annotation-size limit. The Prometheus Operator troubleshooting guide recommends server-side apply on supported Kubernetes releases; this example assumes the pinned manifests are stored in `./prometheus-operator-crds/`:

```bash
kubectl apply --server-side --force-conflicts -f ./prometheus-operator-crds/
```

Use `--force-conflicts` only for CRDs whose field ownership you have reviewed. Do not point an unattended production installation at an unpinned `latest` URL.

## Order Helm and Argo CD Reconciliation

A safe full-stack ordering is:

```text
CRDs -> wait for Established and discovery -> Operator/RBAC -> ServiceMonitor objects
```

For Helm, determine whether the chosen chart ships the Prometheus Operator CRDs in its `crds/` directory or documents a separate CRD lifecycle. On initial install, Helm installs CRDs from `crds/` before chart templates. Helm skips CRDs that already exist and does not upgrade or delete CRDs from `crds/`, so follow the chart's CRD upgrade procedure or apply the pinned CRDs separately before upgrading dependent resources. A chart that only creates an application's ServiceMonitor cannot register the kind itself.

For Argo CD, a CRD and its custom resources can be part of the same sync: Argo CD automatically skips the missing-type dry run when the CRD manifest is present, applies the CRD, and can then create the custom resource. If the CRD is managed by another Application or created by another controller, reconcile and explicitly gate that source before syncing ServiceMonitor objects. Sync waves provide ordering and a short inter-wave delay; use an explicit health or wait check when you need to prove `Established` and discovery rather than relying on the delay alone.

Clients without CRD-aware sequencing can fail when one run submits a CRD and its instances before the new API endpoint is discoverable. Helm handles this for CRDs in `crds/`, and Argo CD handles CRDs included in the same sync. For other arrangements, once the wait succeeds, rerun the failed operation. Repeated retries do not fix an absent or incompatible CRD.

## Validate the Manifest Against the Live Schema

Once discovery works, use server-side dry run so the live CRD validates the object:

```bash
kubectl apply --server-side --dry-run=server -f servicemonitor.yaml
kubectl explain servicemonitor.spec \
  --api-version=monitoring.coreos.com/v1 \
  --recursive
```

The canonical identity is:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
```

Do not change the API group merely to make an error disappear. Query the installed CRD's `spec.versions` and use a version with `served: true`.

After creation, a separate selection path begins. The Prometheus custom resource discovers ServiceMonitors through `serviceMonitorSelector` and `serviceMonitorNamespaceSelector`. A ServiceMonitor selects Endpoints or EndpointSlices, normally through labels on their backing Kubernetes Services; an endpoint can use `port` for a named Service port or `targetPort` for a selected Pod container port by name or number. Probe and ScrapeConfig are separate CRDs with separate Prometheus selectors; installing one does not make another kind available.

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
