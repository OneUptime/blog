# Validation Summary: How to Use the 'Replace' Sync Option in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- GitOps
- Kubernetes Services, Deployments, and Jobs

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- Kubernetes `kubectl replace` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_replace/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The post incorrectly described `Replace=true` as delete-and-create behavior. Updated it to match Argo CD documentation: `Replace=true` uses `kubectl replace` or `kubectl create`; destructive recreation requires `Force=true,Replace=true`.
- The post said Replace solves immutable field errors by forcing recreation. Corrected this because `kubectl replace` is still an update and normally fails on immutable field changes; Argo CD recreation requires `Force=true,Replace=true`.
- The Service type example implied that changing `ClusterIP` to `LoadBalancer` often requires Replace. Corrected this to focus on immutable Service `clusterIP` changes instead.
- The Job rerun examples used only `Replace=true`. Updated them to `Force=true,Replace=true`, which is the Argo CD documented pattern for deleting and recreating Jobs on sync.
- The CLI section said `argocd app sync --force` is equivalent to Replace. Corrected it to describe `--force` as force apply and distinguish it from `Replace=true`.
- The downtime, status loss, and API load sections treated all Replace operations as delete-and-create operations. Updated them to distinguish full-object replacement from forced delete/create behavior.
- The server-side apply section claimed it can resolve some immutable field conflicts. Corrected this because server-side apply does not bypass Kubernetes immutable field validation.
- The troubleshooting section said Replace fails for missing resources and only works after the first sync. Corrected this because Argo CD uses `kubectl replace` or `kubectl create` when `Replace=true` is set.

## Review Notes
The reviewed examples use current Argo CD sync option names and current Kubernetes API versions. The local `argocd` and `kubectl` binaries were not installed in the workspace, so CLI behavior was verified against official command reference documentation instead of local `--help` output.
