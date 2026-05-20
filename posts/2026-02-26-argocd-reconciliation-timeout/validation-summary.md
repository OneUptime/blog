# Validation Summary: How to Configure Reconciliation Timeout in ArgoCD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Prometheus metrics
- Kubernetes ConfigMaps and StatefulSets

## Sources Consulted
- Argo CD FAQ: repository polling interval, jitter, and disabling polling - https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD High Availability guide: `timeout.reconciliation` duration string format and controller StatefulSet - https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/high_availability/
- Argo CD annotations and labels reference: `argocd.argoproj.io/refresh` and `argocd.argoproj.io/skip-reconcile` values - https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD command parameters ConfigMap reference: `controller.sync.timeout.seconds` - https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD metrics reference: `argocd_app_reconcile` histogram - https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd app get` command reference: `--refresh` and `--hard-refresh` flags - https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD API docs: bearer-token API usage - https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Kubernetes `kubectl patch` reference: strategic patch syntax - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post described the default reconciliation interval as exactly 180 seconds and omitted jitter. Updated it to the documented 120-second interval plus up to 60 seconds of jitter.
- The `timeout.reconciliation` examples used bare numeric strings such as `"300"`, but Argo CD documents this setting as a duration string such as `5m`, `60s`, or `1h`. Updated examples to duration strings and added `timeout.reconciliation.jitter` where showing the default.
- The restart command targeted `deployment argocd-application-controller`, but current Argo CD installs use a StatefulSet for the application controller. Updated the command to use `statefulset argocd-application-controller`.
- The post claimed `argocd.argoproj.io/refresh` can set per-application reconciliation intervals. That annotation only accepts `normal` or `hard` and requests a one-time refresh. Rewrote the section to describe one-time refresh behavior.
- The disabling section said `timeout.reconciliation: "0"` disables reconciliation for specific applications, but that setting disables global polling. Updated the wording to avoid implying per-application behavior.
- The sync timeout section referenced a nonexistent `timeout.sync` setting and implied retry backoff config sets sync timeout. Updated it to use `controller.sync.timeout.seconds` in `argocd-cmd-params-cm` and clarified that retry options control retries, not total sync duration.
- The monitoring examples used `argocd_app_reconcile_duration_seconds_*`, but the official metric is the `argocd_app_reconcile` histogram. Updated the metric names and PromQL expression.
- The API refresh example used `POST`; updated it to `GET` to match Argo CD's get-application refresh flow.
- The controller resources example was shaped like a standalone `StatefulSet` manifest but omitted required fields for a valid object. Replaced it with a `kubectl patch statefulset` command that updates the existing controller workload.

## Review Notes
I could not run `kubectl` locally because it is not installed in the workspace, so Kubernetes command syntax was checked against Argo CD documentation rather than local `--help` output.
