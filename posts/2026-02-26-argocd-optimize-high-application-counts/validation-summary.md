# Validation Summary: How to Optimize ArgoCD for High Application Counts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- ApplicationSet
- Prometheus metrics

## Sources Consulted
- Argo CD argocd-cm ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Git webhook configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD diff strategies and server-side diff: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD diff customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD resource tracking: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD resource exclusion/inclusion: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD high availability and shallow clone guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo add command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD metrics reference: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD orphaned resources monitoring: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/

## Issues Found
- The Git metrics examples used `argocd_git_request_duration`, but the documented repo-server metric is `argocd_git_request_duration_seconds`. Updated both examples.
- The webhook secret example placed `webhook.github.secret`, `webhook.gitlab.secret`, and `webhook.bitbucket.uuid` under generic ConfigMap-style `data`. Argo CD documents these keys in the `argocd-secret` Secret, so the example now uses `kind: Secret` with `stringData`.
- The hard reconciliation comment described the setting as forcing a full comparison. Updated it to match the documented meaning: refreshing application data and the target manifest cache.
- The server-side diff explanation claimed it is much faster for large resource sets. Argo CD documents it as a dry-run server-side apply strategy with caching, so the wording now describes the actual behavior without making an unsupported speed guarantee.
- The repo-server cache example used unsupported keys `reposerver.git.shallow.clone` and `reposerver.parallelism.limit`. Replaced them with documented `reposerver.git.lsremote.parallelism.limit` and a per-repository Secret using `depth: "1"` for shallow clones.
- The resource tracking section said Argo CD supports two tracking methods and that `label` is the default. Current documentation lists `label`, `annotation+label`, and `annotation`; the text now says three methods and avoids an outdated default claim.
- The orphaned resource monitoring snippet used a non-documented `controller.resource.orphaned.check.disabled` command parameter. Replaced it with a project-scoped JSON patch that removes `spec.orphanedResources`, matching the documented AppProject configuration model.
- The ApplicationSet section claimed ApplicationSets reduce the number of unique manifests Argo CD processes. ApplicationSets generate Application resources from templates; the wording now accurately says they reduce hand-written Application manifests.
- The Kubernetes API client tuning keys were shown as `controller.k8s.client.config.qps` and `controller.k8s.client.config.burst`. Updated them to the documented `controller.k8s.client.qps` and `controller.k8s.client.burst` keys.

## Review Notes
The post is technically relevant and remains a valid Argo CD performance tuning guide after the corrections. Server-side diff and increased controller/API concurrency can increase Kubernetes API server traffic, so production users should measure API server load when enabling those options.
