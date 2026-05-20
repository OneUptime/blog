# Validation Summary: How to Configure ArgoCD for Low-Bandwidth Edge Sites

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus metrics
- Kubernetes API server and client traffic
- Git webhooks
- Helm and Kustomize manifest generation

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD argocd-cm configuration reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD argocd-cmd-params-cm configuration reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD declarative setup and cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/

## Issues Found
- The metrics examples used `argocd_cluster_api` and `argocd_cluster_api_server_requests_total`, which are not the documented current request metrics. Updated the examples to use `argocd_kubectl_requests_total`, which is exposed by the application controller and includes cluster/server labels.
- The post claimed `argocd.argoproj.io/refresh: "1800"` configures a per-Application reconciliation interval. That annotation only accepts `normal` or `hard` and triggers a one-time refresh. Replaced the snippet with a clarification that per-Application reconciliation intervals are not supported that way.
- The resource tracking section overstated the bandwidth effect of annotation tracking and described label tracking as requiring broad resource listing. Updated the explanation to match Argo CD's documented purpose: avoiding label conflicts and improving ownership precision.
- The per-Application server-side diff example incorrectly used sync options. Updated it to use the documented `argocd.argoproj.io/compare-options: ServerSideDiff=true` annotation, and kept `ServerSideApply=true` and `ApplyOutOfSyncOnly=true` in a separate sync-options example.
- The server-side diff explanation implied a guaranteed bandwidth reduction. Updated it to describe the documented behavior: Kubernetes server-side apply dry-run is used to calculate predicted live state and can improve diff accuracy for server-side apply workflows.
- The repo cache example used a less precise duration format and implied that 24 hours was longer than default. Updated it to `24h0m0s` and described it as keeping manifest/revision cache entries for 24 hours.
- The webhook ConfigMap snippet was mislabeled as configuring a webhook secret. Updated the comment to say it disables periodic repository polling.
- The cluster secret placeholder for `caData` did not indicate that Argo CD expects base64-encoded certificate data. Updated the placeholder to `<base64-ca-cert>`.
- The section title referred to resource hooks while the example used sync waves. Renamed it to "Selective Sync with Sync Waves."

## Review Notes
The post remains a general optimization guide rather than a benchmark. The exact bandwidth reduction will vary by application size, number of watched resources, cluster latency, cache state, and sync policy, so the fixed 80-90 percent reduction claim was softened.
