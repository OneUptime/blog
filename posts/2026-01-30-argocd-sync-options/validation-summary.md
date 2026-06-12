# Validation Summary: How to Implement ArgoCD Sync Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD Application manifests
- Argo CD CLI
- Kubernetes garbage collection

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app sync` Command Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Kubernetes Garbage Collection: https://kubernetes.io/docs/concepts/architecture/garbage-collection/

## Issues Found
- The post stated that sync options can be set globally for all applications via ArgoCD config. Argo CD documents sync options primarily at the Application level and resource annotation level, with only some related behavior configurable through system-level resource customizations. Updated the wording to distinguish global configuration from sync option placement.
- The post described `Replace=true` as deleting and recreating resources. Argo CD uses `kubectl replace` or `kubectl create`; it can be destructive and may cause recreation or outages, but it is not inherently a delete/create operation. Updated the explanation, Mermaid diagram, and warning.
- The post described server-side apply as automatic conflict detection and claimed it is required for some complex CRDs. Current Argo CD documentation says Argo CD uses `kubectl apply --server-side --force-conflicts` and highlights use cases such as avoiding the client-side apply annotation size limit, patching resources not fully managed by Argo CD, and using managed fields. Updated the description and benefits.
- The resource-level annotation example used the same YAML key twice, which makes the first `argocd.argoproj.io/sync-options` value invalid/overridden. Combined the options into a single comma-separated annotation value, as documented by Argo CD.
- The automated sync diagram used a fixed "Wait 3 minutes" node. Current Argo CD documentation describes the reconciliation timing as configurable and defaults to 120 seconds plus up to 60 seconds of jitter. Changed the diagram to "Wait reconciliation interval."
- The Allow Empty section implied all syncs reject deletion of every resource by default. Argo CD documents this as a safety behavior for automated pruning. Updated the wording.
- The sync waves section claimed resources in the same wave sync in parallel. Argo CD documents ordering by phase, wave, kind, and name. Updated the statement to match the documented ordering.

## Review Notes
The post is technically relevant and valid after the corrections. The examples are generic and do not pin an Argo CD version; they were reviewed against the current official Argo CD documentation as of 2026-06-12.
