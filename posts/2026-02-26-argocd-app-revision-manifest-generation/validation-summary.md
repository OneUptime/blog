# Validation Summary: How to Pass ARGOCD_APP_REVISION to Manifest Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Config Management Plugins
- Prometheus / PromQL
- Python

## Sources Consulted
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/build-environment/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_app_history/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Kubernetes Labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations

## Issues Found
- Corrected the tag-tracking behavior for `ARGOCD_APP_REVISION`. The post said a Git tag target produces the tag name, but Argo CD documents `ARGOCD_APP_REVISION` as the resolved revision. The tag name is available as `ARGOCD_APP_SOURCE_TARGET_REVISION`; `ARGOCD_APP_REVISION` is the commit SHA the tag resolves to.
- Added missing `spec.project` and `spec.destination` fields to full Argo CD Application examples so the examples are valid Application manifests.
- Replaced a custom annotation using the reserved `kubernetes.io` prefix with an `app.kubernetes.io` annotation.
- Clarified the dynamic image tagging flow so it does not imply the config repository commit is automatically the application source-code commit unless the image is actually tagged that way.
- Replaced invalid fake Git SHA examples containing non-hex characters with valid hex-like examples.
- Clarified the multi-source explanation so it describes per-source manifest generation instead of implying a distinct "primary source" revision.
- Clarified label truncation guidance for tag values, since Kubernetes label values must satisfy both length and character-set rules.

## Review Notes
The examples are technically valid as illustrative snippets. For production use, teams should ensure any tag or revision copied into Kubernetes labels is sanitized, not only truncated, if tag names may contain characters outside Kubernetes label syntax.
