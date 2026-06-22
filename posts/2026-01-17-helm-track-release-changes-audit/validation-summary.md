# Validation Summary: How to Track Helm Release Changes and Maintain Audit Trails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Helm Diff plugin
- Kubernetes Jobs, ConfigMaps, Secrets, and kubectl
- Fluent Bit
- Elasticsearch index templates
- GitHub Actions
- Argo CD Notifications
- Slack webhooks

## Sources Consulted
- Helm `history` command documentation: https://helm.sh/docs/helm/helm_history/
- Helm `get values` command documentation: https://helm.sh/docs/helm/helm_get_values/
- Helm `get manifest` command documentation: https://helm.sh/docs/helm/helm_get_manifest/
- Helm `get metadata` command documentation: https://helm.sh/docs/helm/helm_get_metadata/
- Helm `upgrade` command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm `rollback` command documentation: https://helm.sh/docs/helm/helm_rollback/
- Helm `uninstall` command documentation: https://helm.sh/docs/helm/helm_uninstall/
- Helm `plugin install` command documentation: https://helm.sh/docs/helm/helm_plugin_install/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm Diff plugin README: https://github.com/databus23/helm-diff
- Kubernetes Job and TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/ and https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit modify filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/modify
- Argo CD Notifications webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/webhook/
- Argo CD Notifications template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- The architecture diagram used `helm delete`. Updated it to `helm uninstall`, the current Helm command name for uninstalling releases.
- The values comparison used `helm get values` without `--all`, which only returns user-supplied values. Added `--all` so the example compares computed values for each revision.
- The Helm Diff installation example only showed the Git repository install command. Added a Helm 4-compatible signed release tarball example with GPG key import, matching current Helm plugin provenance behavior and the Helm Diff README.
- The hook examples used `hook-succeeded` and `hook-failed` deletion policies while later examples expected hook logs to remain available. Changed the hooks to use `before-hook-creation` with Job TTLs so logs can remain briefly available for collection and debugging.
- The pre-upgrade hook recorded `${HELM_USER:-unknown}`, but Helm does not automatically inject a `HELM_USER` environment variable into hook Pods. Changed the example to read an explicit chart value with a safe default.
- The rollback hook lacked `ttlSecondsAfterFinished` after changing the delete policy. Added the same TTL used by the other audit Jobs.
- The audit storage table implied Kubernetes Secrets are inherently limited to 10 revisions. Updated the wording to clarify that Helm's saved revision count is configurable and defaults to 10 for saved release revisions.
- The Argo CD notification example defined a trigger and webhook service but did not mention the required notification subscription. Added the required Application annotation as a snippet comment.

## Review Notes
- The Helm release Secret decoding command is a common Helm 3 troubleshooting technique, but it depends on the default Kubernetes Secret storage driver.
- The hook examples assume the chart provides the referenced helper templates, service account, RBAC, and webhook Secrets.
- The GitHub Actions workflow is valid for ordinary push events, but first commits or unusual shallow history cases may require additional fallback handling.
