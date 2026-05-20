# Validation Summary: How to Upgrade ArgoCD from 2.11 to 2.12

## Status
validated

## Post Type
Technical upgrade guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Redis
- ApplicationSet
- Prometheus

## Sources Consulted
- Argo CD official v2.11 to v2.12 upgrade notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.11-2.12/
- Argo CD 2.12 installation and tested Kubernetes versions: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/installation/
- Argo CD 2.12 `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD 2.12 `argocd-cm` example: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/argocd-cm-yaml/
- Argo CD 2.12 CLI command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/metrics/
- Argo Helm chart `argo-cd-7.4.0` metadata and values: https://github.com/argoproj/argo-helm/tree/argo-cd-7.4.0/charts/argo-cd
- Argo CD v2.12.0 manifests and CRDs: https://github.com/argoproj/argo-cd/tree/v2.12.0/manifests
- Kubernetes server-side apply merge strategy documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/#merge-strategy

## Issues Found
- The post incorrectly stated that Argo CD 2.12 requires Kubernetes 1.27+ and drops Kubernetes 1.26. Updated this to say Argo CD 2.12 was tested with Kubernetes 1.26 through 1.29.
- The post listed several unsupported or non-version-specific "new features" for 2.12. Replaced them with changes documented in the official upgrade notes.
- The post claimed Redis 7.0+ was a hard upgrade requirement. Updated this to focus on the Redis image/version used by the v2.12 manifests and the Helm chart registry change to AWS ECR.
- The deprecated-feature audit used checks that were not 2.12 removals. Replaced it with a check for project-scoped cluster secrets, which is a documented 2.12 behavior change.
- The post claimed settings moved from `argocd-cm` to `argocd-cmd-params-cm` and placed `application.resourceTrackingMethod` in the wrong ConfigMap. Updated the examples so command parameters stay in `argocd-cmd-params-cm` and resource tracking stays in `argocd-cm`.
- The Helm chart version was wrong: `argo-cd` chart `7.3.0` maps to Argo CD `v2.11.3`, not `v2.12.0`. Updated it to chart `7.4.0`.
- Several commands treated `argocd-application-controller` as a Deployment. Updated rollout, logs, resource, and restart commands to use the StatefulSet.
- The Redis verification command invoked `argocd-server` as though it had a `version` subcommand. Replaced it with a direct `redis-cli ping` check.
- The Prometheus alert used a raw lifetime counter comparison. Updated it to use `increase()` over a time window.
- The summary repeated the inaccurate Kubernetes, Redis, and performance claims. Updated it to match the verified upgrade requirements and caveats.

## Review Notes
The guide now reflects the official Argo CD 2.12 upgrade notes and the community Helm chart mapping for Argo CD 2.12.0. Operators should still test against their exact patch release and installation method because chart defaults and supported patch versions can differ from the raw upstream manifests.
