# Validation Summary: How to Force Refresh Application State in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD API
- Kubernetes ConfigMaps and Secrets
- Git webhooks

## Sources Consulted
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD FAQ on repository polling and `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/

## Issues Found
- The post described the default polling interval as exactly 3 minutes and configured `timeout.reconciliation` as `"60"`. Current Argo CD documentation describes the default as `120s` plus up to `60s` of jitter, and uses duration strings such as `60s`. Updated the wording and snippet to use `timeout.reconciliation: "60s"`.
- The CLI section said `argocd app diff my-app --refresh` could "just trigger the refresh without waiting." The official command reference describes it as performing a diff, with `--refresh` refreshing application data when retrieving. Updated the wording to say it refreshes before showing the diff.

## Review Notes
The remaining CLI flags, API refresh query values, webhook endpoint and GitHub secret key, Kubernetes resource examples, and refresh vs sync explanation are consistent with the official Argo CD documentation reviewed.
