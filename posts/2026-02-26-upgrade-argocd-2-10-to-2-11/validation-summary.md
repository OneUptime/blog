# Validation Summary: How to Upgrade ArgoCD from 2.10 to 2.11

## Status
validated

## Post Type
Tutorial / Upgrade guide

## Technologies Covered
- Argo CD 2.10 and 2.11
- Argo CD Application and ApplicationSet CRDs
- Argo CD Notifications
- Argo CD ApplicationSet progressive syncs
- Argo CD server-side diff
- argo-helm `argo-cd` chart
- Kubernetes and kubectl
- Helm

## Sources Consulted
- Argo CD official v2.10 to v2.11 upgrade notes: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/upgrading/2.10-2.11/
- Argo CD official upgrade overview: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/upgrading/overview/
- Argo CD official diff strategies documentation for release 2.11: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD official ApplicationSet progressive syncs documentation for v2.11.0: https://github.com/argoproj/argo-cd/blob/v2.11.0/docs/operator-manual/applicationset/Progressive-Syncs.md
- Argo CD official command parameters ConfigMap for v2.11.0: https://github.com/argoproj/argo-cd/blob/v2.11.0/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD official high availability documentation for v2.11.0: https://github.com/argoproj/argo-cd/blob/v2.11.0/docs/operator-manual/high_availability.md
- Argo CD official tested Kubernetes versions for v2.11.0: https://github.com/argoproj/argo-cd/blob/v2.11.0/docs/operator-manual/tested-kubernetes-versions.md
- argo-helm official chart metadata for `argo-cd` chart 6.11.0: https://github.com/argoproj/argo-helm/blob/argo-cd-6.11.0/charts/argo-cd/Chart.yaml
- argo-helm official chart README upgrade notes: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Argo CD v2.11.0 GitHub release: https://github.com/argoproj/argo-cd/releases/tag/v2.11.0

## Issues Found
- The post claimed Argo CD 2.11 introduced or improved several features not documented as 2.10-to-2.11 changes, including webhook handling, health checks, notification variable renames, merge generator behavior changes, and CLI JSON output changes. I replaced those with documented 2.11 upgrade concerns: the Application CRD schema update, the 2.11.2 Redis NetworkPolicy egress change, and the argo-helm controller StatefulSet option.
- The Kubernetes compatibility comment said Argo CD 2.11 supports Kubernetes 1.27 through 1.31. The official tested version matrix for Argo CD 2.11 lists Kubernetes v1.25 through v1.29, so I corrected the text.
- The `kubectl version --short` command is not current for newer kubectl versions. I changed it to `kubectl version`.
- Server-side diff was described as stable and recommended in 2.11. Official 2.11 documentation marks it beta since v2.10.0 and opt-in, so I corrected the wording.
- ApplicationSet progressive syncs were described as a 2.11 improvement. Official 2.11 documentation marks progressive syncs as an opt-in alpha feature, so I corrected the wording.
- The controller sharding section described "sharding V2" as recommended. Official 2.11 documentation lists `legacy` as the default and `round-robin` as an alpha option, so I corrected the text.
- The ApplicationSet RollingSync example matched on a `region` label but did not add that label to generated Applications. I added `metadata.labels.region` to the ApplicationSet template so the RollingSync selectors have a generated Application label to match.
- The memory warning attributed increased memory to the repo server. Server-side diff is controlled by the application controller and sends dry-run server-side apply requests to the Kubernetes API server, so I changed the note and resource example to focus on the controller and API server.
- The webhook troubleshooting section claimed webhook paths may have changed. I found no official 2.10-to-2.11 path change, so I changed it to generic webhook configuration and server log troubleshooting.

## Review Notes
The post is now technically aligned with the official Argo CD 2.11 upgrade notes and related feature documentation. Some operational advice remains intentionally general, such as backing up notification templates and testing custom health checks in staging.
