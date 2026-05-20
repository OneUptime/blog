# Validation Summary: How to Debug Resource Tracking Issues in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Helm
- Bash
- jq
- YAML

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD v2.14 to v3.0 upgrade notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.14-3.0/
- Argo CD argocd-cm example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD app resources command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD upstream stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post stated that an empty `application.resourceTrackingMethod` means default label-based tracking. This is outdated for Argo CD 3.0 and newer, where the default is annotation-based tracking. Updated the text to distinguish Argo CD 3.x from Argo CD 2.x behavior.
- The tracking mode list implied the older label-first default. Updated the ordering and descriptions to match current Argo CD documentation while preserving all three supported methods.
- The debug logging example patched `argocd-application-controller` as a Deployment with a command override. Current upstream Argo CD manifests run the application controller as a StatefulSet and expose `controller.log.level` through `argocd-cmd-params-cm`. Updated the example and log command accordingly.
- The automated health check script only checks `app.kubernetes.io/instance` labels. Added a note in the script comment that this applies to label or annotation+label tracking, not pure annotation tracking.

## Review Notes
The commands and configuration examples are generally accurate for modern Argo CD and Kubernetes, but several examples still assume the default `app.kubernetes.io/instance` label is present. That is appropriate only when using `label` or `annotation+label` tracking. For pure annotation tracking in Argo CD 3.x, operators should query `argocd.argoproj.io/tracking-id` annotations instead.
