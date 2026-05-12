# Validation Summary: Scheduled Scaling with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2.x (kustomize.toolkit.fluxcd.io/v1)
- Kubernetes (Deployment, HPA)
- Kustomize overlays
- KEDA (keda.sh/v1alpha1 ScaledObject with cron triggers)
- kubectl CLI
- Linux cron expressions

## Sources Consulted
- KEDA Cron Scaler documentation: https://keda.sh/docs/2.13/scalers/cron/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes HPA behavior / stabilizationWindowSeconds documentation

## Issues Found
No technical issues found.

Verified items:
- `apiVersion: kustomize.toolkit.fluxcd.io/v1` is the current GA API for Flux v2 Kustomization.
- `apiVersion: keda.sh/v1alpha1` is the correct/current API version for KEDA ScaledObject.
- KEDA cron trigger fields (`timezone`, `start`, `end`, `desiredReplicas`) are correct, with `desiredReplicas` as a string and Linux-format cron expressions.
- Cron expressions match their stated semantics: `45 7 * * 1-5` is 7:45 AM Mon–Fri; `0 22 * * *` to `30 23 * * *` is 22:00–23:30 daily.
- KEDA-managed HPA name format `keda-hpa-<scaledobject-name>` is correct.
- Flux Kustomization fields (`interval`, `sourceRef`, `path`, `prune`, `dependsOn`) are all valid.
- `kubectl patch` with JSON patch (`--type=json`) syntax is correct.
- `stabilizationWindowSeconds` is a valid field under HPA `behavior`.

## Review Notes
- The post briefly references a CronJob-driven approach to switch Flux Kustomization paths (Steps 1–2) but does not include the actual CronJob manifest. This is a stylistic gap, not a technical error — the KEDA-based approach in Steps 3–5 is the fully fleshed-out path.
- The KEDA cron scaler doc notes `desiredReplicas` effectively acts as a dynamic minimum within the window, which is consistent with the post's usage (combined with `minReplicaCount: 5` and `maxReplicaCount: 20`).
- KEDA API has stayed at `v1alpha1` for ScaledObject through current releases; this should be re-checked if a future v1 GA is announced.
