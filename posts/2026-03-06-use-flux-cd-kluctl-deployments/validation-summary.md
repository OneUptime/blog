# Validation Summary: How to Use Flux CD with Kluctl for Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kluctl
- Kluctl Controller / KluctlDeployment CRD
- Flux CD notification-controller
- Kubernetes manifests
- Kustomize-style deployment descriptors
- Jinja2 templating

## Sources Consulted
- Kluctl installation documentation: https://kluctl.io/docs/kluctl/installation/
- Kluctl controller installation documentation: https://kluctl.io/docs/gitops/installation/
- Kluctl project targets documentation: https://kluctl.io/docs/kluctl/kluctl-project/targets/
- Kluctl deployment.yaml documentation: https://kluctl.io/docs/kluctl/deployments/deployment-yml/
- Kluctl variable sources documentation: https://kluctl.io/docs/kluctl/templating/variable-sources/
- KluctlDeployment v1beta1 spec: https://kluctl.io/docs/gitops/spec/v1beta1/kluctldeployment/
- Kluctl Controller API reference: https://kluctl.io/docs/gitops/api/kluctl-controller/
- Kluctl GitOps recipe: https://kluctl.io/docs/recipes/gitops/
- Kluctl CLI common arguments: https://kluctl.io/docs/kluctl/commands/common-arguments/
- Kluctl render, diff, deploy, validate command documentation: https://kluctl.io/docs/kluctl/commands/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification-controller overview: https://fluxcd.io/flux/components/notification/

## Issues Found
- The post described the current Kluctl Controller as a native Flux CD integration and used Flux-style `GitRepository` references in `KluctlDeployment`. Current `gitops.kluctl.io/v1beta1` uses `spec.source.git` or `spec.source.oci`, so the examples now use `source.git.url` and `source.git.path`.
- The Flux HelmRelease-based Kluctl controller installation example referenced an outdated Helm repository pattern. Current Kluctl docs document `kluctl controller install` or managing the controller via a Kluctl git include, so the alternate install snippet was replaced with the documented git include.
- The `.kluctl.yaml` example used target args without declaring allowed deployment args. Added the top-level `args` entries for `environment`, `replicas`, and `domain`.
- The root `deployment.yaml` used `path: apps` for a nested deployment project and placed `barrier: true` on a path item. Kluctl uses `include` for sub-deployment projects and `barrier` as its own deployment item, so both examples were corrected.
- The root variable-loading example used `overrideVars`, which is not a current documented `deployment.yaml` field. Changed it to `vars`.
- The KluctlDeployment examples used a non-existent `deployOnChanges` field. Removed it because current reconciliation already deploys when rendered objects change, with `deployInterval` available for periodic forced deploys.
- The manual approval example used `suspend`, `dryRun`, and an annotation as approval flow. Current KluctlDeployment supports `manual: true` and approval through `manualObjectsHash` or the Kluctl Webui, so the example was corrected.
- CLI snippets used the less-documented long `--target` form and used `kluctl validate` as a template-rendering check. Updated examples to use `-t` and `kluctl render` for template validation.
- The Flux Alert example used `severity` instead of the current `eventSeverity` field and attempted to alert directly on `KluctlDeployment` resources. Flux notification-controller documents Alerts for Flux object events, so the example now watches the Flux `Kustomization` that applies the KluctlDeployment manifests.
- The forced reconciliation example used a raw annotation. Updated it to the documented `kluctl gitops reconcile --namespace ... --name ...` command.

## Review Notes
The post is now aligned with the current Kluctl GitOps API. It still assumes Flux is used to apply and manage the KluctlDeployment manifests in Git, while Kluctl Controller performs the actual Kluctl reconciliation.
