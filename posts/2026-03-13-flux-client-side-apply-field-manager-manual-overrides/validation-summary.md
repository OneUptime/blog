# Validation Summary: How to Use flux-client-side-apply Field Manager for Manual Overrides

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes server-side apply
- Kubernetes managedFields and field managers
- kubectl apply, annotate, label, and patch
- Horizontal Pod Autoscaler ownership handoff

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux FAQ on kubectl edits and `flux-client-side-apply`: https://fluxcd.io/flux/faq/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post implied that any different field manager could preserve manual additions under Flux's default behavior. Updated the text and examples to use Flux's documented `flux-client-side-apply` manager for kubectl-added fields.
- The annotation and label examples did not set a field manager, so Flux could revert those changes. Added `--field-manager=flux-client-side-apply` to both commands.
- The server-side apply example used a custom `ops-override` field manager while describing default Flux behavior. Changed it to `flux-client-side-apply`.
- The Flux SSA annotation section listed `Merge` as the default. Corrected the default to `Override` and clarified the behavior of `Merge`, `IfNotPresent`, and `Ignore`.
- The managedFields cleanup example removed a single array entry manually. Replaced it with Kubernetes' documented pattern for clearing managedFields with `managedFields: [{}]` and added cautionary wording.
- The HPA ownership handoff was too abrupt and could cause Deployment replicas to default to 1 before HPA claims the field. Added the documented handoff caveat.
- The introduction overstated SSA conflict behavior. Clarified that conflicts arise when an apply manager tries to change a field owned by another manager.

## Review Notes
The local environment did not have `kubectl` or `flux` installed, so CLI flags were verified against official generated Kubernetes and Flux documentation instead of local `--help` output.
