# Validation Summary: How to Handle Resources Created Outside ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- jq
- yq
- Kubernetes RBAC
- Kyverno
- GitOps drift detection

## Sources Consulted
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Orphaned Resources Monitoring: https://argo-cd.readthedocs.io/en/release-2.2/user-guide/orphaned-resources/
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Declarative Setup, Resource Exclusion/Inclusion: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD 2.14 to 3.0 upgrade notes: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.14-3.0/
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Match and Exclude: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/

## Issues Found
- Argo CD resource tracking was described as label-or-annotation tracking configured only by `application.instanceLabelKey`. Updated this to reflect current Argo CD behavior: annotation tracking is the default, `application.resourceTrackingMethod: label` enables label-based tracking, and `application.instanceLabelKey` customizes the label key.
- The orphan-detection and cleanup scripts only checked `app.kubernetes.io/instance`, which is not sufficient for current annotation-based Argo CD tracking. Updated both scripts to check the tracking annotation by default and support label mode when configured.
- The adoption section referred to adding a tracking label while showing an annotation command. Renamed the section to tracking metadata and added a caution that manually constructing tracking annotations is mainly a migration aid.
- The `argocd app sync --force --replace` description understated the destructive behavior. Updated it to match Argo CD docs: replace uses `kubectl replace/create`, and force plus replace may delete and recreate resources.
- The exclusion section mixed `ignoreDifferences`, resource exclusions, and compare options as if all excluded resources from tracking. Updated the language to distinguish field-level diff ignores, global discovery/sync exclusions, and `IgnoreExtraneous` sync-status behavior.
- The Kubernetes RBAC example included a comment implying RBAC supports explicit deny rules. Removed the misleading deny comment; the Role grants only read verbs.
- The Kyverno policy used deprecated `spec.validationFailureAction` and older direct `match.resources`/`exclude.resources` syntax. Updated it to current `validate.failureAction` and `match.any`/`exclude.any` syntax, and changed the policy to require the current Argo CD tracking annotation.
- The operator-created resources example described ignoring entire operator-managed resources while the configuration only ignores fields for resources already in the Application. Updated the comment to reflect field-level diff behavior.

## Review Notes
The article is technically valid after the fixes. The shell scripts remain examples and should still be reviewed carefully before deletion in a real cluster, especially in environments using custom Argo CD tracking settings or multiple Argo CD installations.
