# How to Use KubeVela with Argo CD Without Creating Two Competing Reconcilers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Argo CD, GitOps, Application Delivery, Continuous Delivery

Description: Give Argo CD ownership of KubeVela control-plane objects and KubeVela ownership of rendered workloads to avoid reconciliation loops.

---

Argo CD and KubeVela can complement each other when their ownership boundary is explicit. Argo CD should reconcile the KubeVela `Application`, approved definitions, policies, and bootstrap resources on the hub cluster. KubeVela should render, dispatch, update, and garbage-collect the Deployments, Services, Ingresses, Helm releases, and multi-cluster resources produced from that Application.

The dangerous design is to commit both the KubeVela Application **and** its rendered Deployment to Argo CD while KubeVela also owns that Deployment. Two control loops can then alternate replicas, labels, images, selectors, or owner metadata forever.

## Draw the ownership boundary

Use this invariant:

```text
Git -> Argo CD -> KubeVela Application on hub
                    |
                    +-> KubeVela -> generated resources on hub/spokes
```

Argo CD owns objects rendered from its configured sources. KubeVela owns objects represented by components, traits, topology policies, and workflows. An external autoscaler may own a deliberately excluded field such as `spec.replicas`, using KubeVela's documented `apply-once` policy.

Document field-level exceptions. “Both controllers manage it but ignore some differences” is not a stable ownership model unless the exact paths and lifecycle are tested.

## Put the KubeVela Application in Git

For example, store only this delivery object-not its rendered Deployment:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: inventory
  namespace: delivery
  annotations:
    app.oam.dev/publishVersion: "inventory-4.2.0"
    argocd.argoproj.io/sync-options: Prune=confirm
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/inventory@sha256:<verified-digest>
        ports:
          - name: http
            port: 8080
            expose: true
      traits:
        - type: scaler
          properties:
            replicas: 3
```

Replace the image placeholder with a real digest. Because `app.oam.dev/publishVersion` identifies a static Application revision, change it to a new unique value whenever changes to the Application or its referenced dependencies should take effect. Otherwise, KubeVela continues using the pinned revision.

`Prune=confirm` is an Argo CD per-resource sync option that requires deletion approval. It is useful because pruning the KubeVela Application can trigger KubeVela garbage collection of many generated resources. Whether to use it is a release-policy decision; test deletion and finalizer behavior before relying on it.

An Argo CD `Application` can target the hub cluster and the `delivery` namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: inventory-vela
  namespace: argocd
spec:
  project: applications
  source:
    repoURL: https://git.example.com/platform/apps.git
    targetRevision: main
    path: inventory
  destination:
    server: https://kubernetes.default.svc
    namespace: delivery
  syncPolicy:
    automated:
      prune: true
      allowEmpty: true
      selfHeal: true
```

The repository is illustrative. Bootstrap the namespace and RBAC through the owning platform layer. `allowEmpty: true` permits automated pruning when this Application is the last manifest removed from the source; `Prune=confirm` still requires approval before that resource is deleted. With `selfHeal`, a direct edit to the KubeVela Application is reverted to Git; this is desirable only when operators know Git is the source of truth.

## Bootstrap CRDs and definitions first

Argo CD cannot apply a KubeVela Application before the KubeVela CRD exists. Built-in or custom ComponentDefinitions, TraitDefinitions, addons, and destination namespaces must also be available before reconciliation can succeed.

Use separately sequenced Argo CD Applications or sync waves within one Application for infrastructure ordering:

1. KubeVela CRDs and control plane;
2. platform definitions and required addons;
3. namespaces, RBAC, secret-management controllers, and policies;
4. KubeVela Applications.

Argo CD sync waves order objects during one Argo sync; merely splitting objects across separate Applications does not order those Applications. KubeVela workflows order component delivery and multi-cluster promotion after the KubeVela Application exists. Do not use one system's ordering feature to imitate the other's runtime responsibility.

## Keep rendered resources out of Argo tracking

Do not feed `vela dry-run` output back into the same Argo CD Application. Dry-run output is for review, policy checks, and debugging. Applying it creates a second desired-state path.

If an organizational policy requires Argo CD to own ordinary Deployments directly, do not model those same Deployments as KubeVela components. Use KubeVela only for a disjoint set of resources or choose one reconciler for that application.

Use Argo CD's annotation-based resource tracking for this pattern. KubeVela propagates Application labels and most annotations to some generated objects, so label-based tracking can misclassify those children as Argo-owned. With annotation tracking, copied tracking IDs that do not identify the child itself neither affect sync status nor make the child a prune candidate.

Argo CD resource exclusions remove matching resources from discovery and sync, while diff and compare customizations suppress selected differences or extraneous sync status. None of these changes who writes an object's fields, so hiding a conflict is not resolving ownership. Keep them narrowly scoped and use them only where the ownership boundary is already explicit.

## Decide who owns definitions and addons

Shared definitions are platform APIs. Deliver them through a platform Argo CD project with restricted write access, separate from team Applications. KubeVela addon enablement itself creates an addon Application and resources, so choose either:

- Git stores reviewed YAML rendered with `vela addon enable <name> --version <version> --dry-run`, and Argo applies that YAML with the compatibility and dependency checks handled separately; or
- a platform automation invokes `vela addon` and records the result outside the team Application repo.

Do not let Argo apply an addon's generated resources while `vela addon` also manages them. Applying dry-run output through Argo bypasses the addon's normal version, dependency, and lifecycle checks, so pin the addon, review its metadata and rendered cluster-scoped resources, and make one path accountable for upgrades and removal.

## Handle health correctly

Argo CD may consider the KubeVela custom resource Synced before KubeVela finishes its workflow. Sync means the hub object matches Git, not that all managed-cluster workloads are healthy.

Observe both layers:

```bash
argocd app get inventory-vela
vela status inventory --namespace delivery --tree --detail
vela revision list inventory --namespace delivery
```

For a unified Argo health view, define a carefully tested Argo CD custom health check for KubeVela `Application` status. Keep it aligned with the installed KubeVela status schema. A stale Lua health rule can report Healthy while a new workflow phase is failing.

Notifications should include both the Git revision and KubeVela publish version so operators can correlate sync and delivery.

## Prevent rollback loops

If a KubeVela release fails, changing live state with `vela workflow rollback inventory --namespace delivery` can be immediately reversed by Argo CD self-heal because Git still contains the failed Application. Coordinate recovery:

1. stop or revert the offending Git change, or temporarily disable automated sync through the approved Argo procedure;
2. run `vela workflow suspend inventory --namespace delivery` if the KubeVela workflow is still progressing;
3. inspect revisions and side effects;
4. roll back KubeVela if safe; and
5. commit the safe desired state before restoring automation.

Do not use `kubectl rollout undo` on a generated Deployment. KubeVela's desired state can overwrite it; Argo CD can do so too only in the disallowed dual-owned design.

## Test deletion and pruning

Argo pruning the hub KubeVela Application initiates KubeVela's resource lifecycle and finalizers. In a staging cluster, test:

- whether all expected hub and spoke resources are deleted;
- which resources a garbage-collection policy preserves;
- what happens when a spoke is unreachable;
- whether Argo waits for finalizers; and
- how a deleted secret or definition affects cleanup.

Never remove KubeVela finalizers or ResourceTrackers merely to make Argo show Synced. That can orphan remote resources.

## Official Documentation

- [KubeVela Application core concept](https://kubevela.io/docs/getting-started/core-concept/)
- [KubeVela Application version control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela pause reconciliation and ownership policies](https://kubevela.io/docs/end-user/workflow/suspending-application-reconciliation/)
- [Argo CD automated sync](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Argo CD sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Argo CD sync phases and waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Argo CD resource tracking](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/)

## Conclusion

Make Argo CD the Git-to-hub reconciler and KubeVela the Application-to-workload reconciler. Commit KubeVela control-plane objects, not their rendered children; bootstrap CRDs and definitions first; and correlate Argo sync with KubeVela workflow health. Coordinate rollback and pruning with Git so self-heal does not reapply the failure or finalizer removal orphan remote resources.
