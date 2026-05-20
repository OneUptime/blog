# Validation Summary: How to Handle Intermittent Connectivity with ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Prometheus alerting
- Linux traffic control (`tc`)

## Sources Consulted
- Argo CD FAQ: reconciliation polling interval and `timeout.reconciliation` settings, https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD annotations and labels reference: `argocd.argoproj.io/refresh` accepted values, https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Argo CD command parameters reference: controller Kubernetes client, cache, keep-alive, and repo-server timeout settings, https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD declarative setup reference: cluster secret schema and resource inclusions/exclusions, https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD application specification reference: retry policy and sync options, https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options reference: `ApplyOutOfSyncOnly` and `ServerSideApply`, https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD metrics reference: `argocd_app_info` labels including `health_status`, https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Argo CD `cluster add` command reference, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/

## Issues Found
- The reconciliation interval example used `timeout.reconciliation: "600"` and implied a fixed 3-minute default. Updated it to duration syntax with jitter (`10m` and `60s`) to match current Argo CD documentation.
- The post claimed `argocd.argoproj.io/refresh: "900"` sets a per-application reconciliation interval. Argo CD only accepts `normal` or `hard` for a one-time refresh trigger, so the text and example were corrected.
- The connection timeout snippet used incorrect or unrelated keys (`controller.kubectl.parallelism` and `reposerver.timeout.seconds`). Replaced them with documented Kubernetes client transport, retry, and controller repo-server timeout settings.
- The cluster secret section claimed per-cluster timeouts could be configured in the secret. Corrected the text to state that cluster secrets hold credentials, TLS, and optional proxy settings, not transport timeouts.
- The resource caching section used a non-documented `controller.cluster.cache.retry.timeout` setting and overstated offline cluster-state behavior. Replaced it with documented app state cache expiration settings and clarified that Argo CD cannot refresh live Kubernetes state while the API server is unreachable.
- The resource tracking section claimed annotation tracking reduces API listing because labels require listing all resources. Corrected this to the documented benefit: avoiding ownership conflicts and label length limits.
- The resource inclusion example incorrectly used `ignoreDifferences`, which only affects diffing. Replaced it with documented `resource.inclusions` configuration in `argocd-cm`.
- The `argocd cluster add` example used `--server-side-diff` for keep-alive behavior. That flag is not part of `argocd cluster add` and server-side diff is unrelated to connection pooling, so the command was replaced with the documented keep-alive settings.

## Review Notes
The remaining examples are version-sensitive because Argo CD command-parameter keys can change across major releases. The post now aligns with the current stable Argo CD documentation available on 2026-05-20.
