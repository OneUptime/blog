# Fixing “No Matches for Kind Rollout” After Installing Argo Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, CustomResourceDefinition, CRD, Installation, kubectl, GitOps, Troubleshooting

Description: Fix Kubernetes discovery errors for the Argo Rollouts Rollout kind by checking context, CRD installation and establishment, served API versions, permissions, and controller health.

---

This error means the Kubernetes API discovery endpoint used by your client does not advertise the requested resource:

```text
resource mapping not found for name: "checkout" namespace: "shop"
no matches for kind "Rollout" in version "argoproj.io/v1alpha1"
ensure CRDs are installed first
```

The `Rollout` kind comes from the cluster-scoped `rollouts.argoproj.io` CustomResourceDefinition. Installing only the kubectl plugin, Argo CD, or Argo Workflows does not install that CRD. A Rollouts controller Pod can also exist while the CRD is missing if a namespace-scoped installation was used, because Argo's `namespace-install.yaml` intentionally excludes CRDs.

The repair is to verify the active cluster, install or reconcile the official Rollouts CRDs, wait for them to become established, and then verify the controller separately. Do not delete the CRD as a shortcut: deleting a CRD also deletes its custom resources from Kubernetes.

## 1. Confirm the Client Is Pointing at the Intended Cluster

A very common cause is installing into one context and applying the Rollout to another.

```bash
kubectl config current-context
kubectl cluster-info
kubectl get namespace argo-rollouts
kubectl get deployment -n argo-rollouts
```

If automation uses an explicit `--context` or `KUBECONFIG`, run every diagnostic with the same inputs. Do not assume that a successful local installation changed the CI runner's cluster.

Capture the server version and identity for evidence:

```bash
kubectl version
kubectl config view --minify --raw=false
```

Review before sharing because kubeconfig output can expose internal endpoints and user names.

## 2. Ask API Discovery Whether Rollout Exists

```bash
kubectl api-resources --api-group=argoproj.io --cached=false
kubectl get customresourcedefinition rollouts.argoproj.io
```

The expected resource has:

```text
NAME        SHORTNAMES   APIVERSION              NAMESPACED   KIND
rollouts    ro           argoproj.io/v1alpha1    true         Rollout
```

Several Argo projects use the `argoproj.io` API group. Seeing `workflows.argoproj.io` or `applications.argoproj.io` does not prove that `rollouts.argoproj.io` is installed.

There are three useful outcomes:

- **CRD is NotFound:** it was never installed in this cluster or was removed.
- **CRD exists but discovery omits Rollout:** inspect establishment conditions and served versions.
- **Discovery shows Rollout:** refresh the failing client's discovery and check the manifest's exact group/version/kind.

## 3. Inspect CRD Health and Served Versions

```bash
kubectl get crd rollouts.argoproj.io -o json \
  | jq '{
      name: .metadata.name,
      deletionTimestamp: .metadata.deletionTimestamp,
      versions: [.spec.versions[] | {name, served, storage}],
      conditions: .status.conditions
    }'
```

The current Rollout manifest API is:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
```

The CRD must list `v1alpha1` with `served: true`, and its `Established` condition should be `True`. `NamesAccepted=False` or a deletion timestamp can explain why discovery is incomplete. If applying the CRD failed, inspect the command's validation or admission error.

Wait for establishment after applying CRDs:

```bash
kubectl wait \
  --for=condition=Established \
  customresourcedefinition/rollouts.argoproj.io \
  --timeout=90s
```

You can query the discovery document directly:

```bash
kubectl get --raw /apis/argoproj.io/v1alpha1 \
  | jq -r '.resources[] | select(.kind == "Rollout") | [.name, .kind, .namespaced] | @tsv'
```

If that request returns a not-found error, this is server-side discovery, not a YAML indentation problem.

## 4. Install the Standard Release Correctly

Argo's standard installation manifest includes the CRDs and installs the controller into `argo-rollouts`:

```bash
kubectl create namespace argo-rollouts --dry-run=client -o yaml \
  | kubectl apply -f -

kubectl apply -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

kubectl wait \
  --for=condition=Established \
  crd/rollouts.argoproj.io \
  --timeout=90s

kubectl rollout status deployment/argo-rollouts -n argo-rollouts
```

The official installation page uses the `latest` release URL. For repeatable production and GitOps installations, resolve an approved release and pin that immutable version in the download URL or vendored manifest instead of allowing future runs to change versions implicitly.

Applying a cluster-scoped CRD with `-n argo-rollouts` is harmless—the CRD itself is not namespaced. The namespace flag matters for namespaced resources in the combined installation manifest.

## 5. Namespace-Scoped Installation Requires a Separate CRD Step

The official `namespace-install.yaml` requires only namespace-level controller privileges, but it deliberately does **not** contain CRDs. A cluster administrator must install them once:

```bash
kubectl apply -k \
  'https://github.com/argoproj/argo-rollouts/manifests/crds?ref=stable'

kubectl wait --for=condition=Established \
  crd/rollouts.argoproj.io \
  --timeout=90s
```

Then install the namespace-scoped controller according to the official installation guide. Pin the Git reference for production rather than relying indefinitely on the moving `stable` ref.

Because CRDs are cluster-wide, an application namespace administrator may be allowed to install the namespaced controller but forbidden to create the CRDs. Coordinate this one-time cluster-level step with the platform owner.

Check authorization:

```bash
kubectl auth can-i create customresourcedefinitions.apiextensions.k8s.io
kubectl auth can-i patch customresourcedefinitions.apiextensions.k8s.io
kubectl auth can-i create rollouts.argoproj.io -n shop
```

If installation output contained `Forbidden`, do not treat a partially created controller Deployment as a successful install.

## 6. Distinguish the CRD, Controller, and CLI Plugin

Argo Rollouts has three independently installed pieces:

| Component | Purpose | Does it make the API recognize `kind: Rollout`? |
| --- | --- | --- |
| Rollouts CRDs | Define Rollout, AnalysisRun, AnalysisTemplate, Experiment, and related APIs | Yes |
| Rollouts controller | Reconciles custom resources into ReplicaSets, Services, analyses, and router changes | No; it depends on the CRDs |
| `kubectl argo rollouts` plugin | Adds visualization and operational commands to the local CLI | No |

Installing the plugin with Homebrew proves only that the local executable exists:

```bash
kubectl argo rollouts version
```

It does not install anything into the current cluster. Conversely, ordinary `kubectl get rollout` works once the CRD exists even if the optional plugin is absent.

After discovery is fixed, verify the controller:

```bash
kubectl get deployment,pods -n argo-rollouts
kubectl logs deployment/argo-rollouts -n argo-rollouts --since=15m
kubectl auth can-i create rollouts.argoproj.io -n shop
```

A Rollout object can be accepted by the API while no healthy controller reconciles it. In that case the original mapping error is fixed, but no ReplicaSets or Pods progress.

## 7. Check the Manifest's Exact GVK

Use the supported capitalization and singular kind:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
        - name: checkout
          image: nginx:1.29
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: {}
```

These similar-looking forms are wrong:

```yaml
apiVersion: apps/v1                  # Deployment API, not Rollout
kind: Rollout
```

```yaml
apiVersion: argoproj.io/v1           # Not the served Rollout version
kind: Rollouts                       # Kind is singular
```

Run server-side validation after discovery succeeds:

```bash
kubectl apply --server-side --dry-run=server -f rollout.yaml
kubectl apply -f rollout.yaml
kubectl argo rollouts get rollout checkout -n shop --watch
```

Client-side dry-run cannot prove that a CRD exists or that admission accepts the object. Server-side dry-run exercises API discovery, the CRD schema, and configured admission without persisting the Rollout.

## 8. Refresh Stale Discovery in Long-Lived Clients

If direct API discovery shows Rollout but a terminal still reports no match, bypass cached discovery:

```bash
kubectl api-resources --api-group=argoproj.io --cached=false
kubectl get rollouts.argoproj.io -A
```

Restart long-lived operators or deployment processes that cached discovery before the CRD was installed. This often affects GitOps controllers, IaC providers, and custom Kubernetes clients more than a fresh `kubectl` process.

Do not make deleting a local kubectl cache the first fix. Verify the server's `/apis/argoproj.io/v1alpha1` response first; a client cannot refresh a resource the server does not serve.

## 9. Fix GitOps and Multi-Document Ordering

A single reconciliation can try to validate a Rollout before its CRD is established, even when both appear in the repository. Make installation ordering explicit:

1. reconcile the pinned CRDs;
2. wait for `Established=True`;
3. reconcile the Rollouts controller and RBAC;
4. wait for the controller Deployment;
5. reconcile application Rollout resources.

For Argo CD, CRDs can be placed in an earlier sync wave, and the application's sync can depend on the platform installation. `SkipDryRunOnMissingResource=true` can address dry-run ordering in documented cases, but it does not install a missing CRD and should not hide an absent platform dependency.

Helm also treats files under a chart's `crds/` directory differently from ordinary templates. Confirm whether your chosen chart installs or upgrades CRDs and make CRD lifecycle an explicit platform responsibility.

## 10. Never Delete a Live CRD to “Refresh” It

Kubernetes documents that deleting a CustomResourceDefinition deletes the custom resources stored under it. Recreating the CRD does not safely reconstruct active Rollouts, AnalysisRuns, or Experiments from the controller.

Prefer an in-place `kubectl apply` of the approved CRD version, inspect validation errors, and follow the Argo Rollouts upgrade instructions. Before any CRD migration, inventory the custom resources and back them up using your platform's supported procedure. List the namespaced and cluster-scoped resources separately:

```bash
kubectl get rollouts,analysisruns,analysistemplates,experiments -A
kubectl get clusteranalysistemplates
```

Treat CRD deletion as a destructive cluster-data operation requiring a separate recovery plan—not a discovery-cache repair.

## Quick Resolution Checklist

- Confirm `kubectl config current-context` matches the installation target.
- Check `crd/rollouts.argoproj.io`, not merely the controller Pod.
- Verify `Established=True` and `v1alpha1` has `served: true`.
- Install official CRDs separately when using `namespace-install.yaml`.
- Check cluster-level permission to create or patch CRDs.
- Use `apiVersion: argoproj.io/v1alpha1` and `kind: Rollout` exactly.
- Refresh or restart clients that cached discovery before installation.
- Order CRDs before custom resources in GitOps.
- Verify the Rollouts controller after the API accepts the object.
- Do not delete the CRD on a cluster that contains Rollout resources.

## Official Documentation

- [Argo Rollouts: Installation](https://argo-rollouts.readthedocs.io/en/stable/installation/)
- [Argo Rollouts: Getting started](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Official installation manifests and RBAC](https://github.com/argoproj/argo-rollouts/tree/master/manifests)
- [Kubernetes: Extend the Kubernetes API with CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Kubernetes: Custom resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes: `kubectl api-resources`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [Argo CD: Sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
