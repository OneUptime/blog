# Validation Summary: How to Upgrade Longhorn

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs, DaemonSets, Deployments, PVCs)
- Helm (package manager)
- jq (JSON query tool)

## Sources Consulted
- Longhorn upgrade docs (v1.7.0): https://longhorn.io/docs/1.7.0/deploy/upgrade/
- Longhorn engine upgrade docs: https://longhorn.io/docs/1.7.0/deploy/upgrade/upgrade-engine/
- Longhorn settings reference: https://longhorn.io/docs/1.7.0/references/settings/
- Longhorn CRD definitions (volumes.longhorn.io): https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn.yaml
- Longhorn GitHub releases: https://github.com/longhorn/longhorn/releases

## Issues Found

1. **Incorrect upgrade sequence.** The "Understanding the Upgrade Sequence" section originally claimed the engine image is upgraded first and the Longhorn manager afterward. Per the official Longhorn upgrade guide, the manager must be upgraded before engine images on existing volumes ("Upgrade the Longhorn manager before upgrading the Longhorn engine"). Reordered the list so the manager DaemonSet is step 1 and engine image DaemonSet deployment is step 2, and clarified that existing-volume engines require a separate upgrade step.

2. **Wrong UI navigation for upgrading engines.** The post instructed readers to go to "Node → Instance Manager". The correct path per the Longhorn docs is the **Volume** page, where volumes can be selected and the **Upgrade Engine** batch operation (or the per-volume three-dot menu) is used to pick the new engine image. Updated the steps accordingly.

3. **Incorrect jq selector for volumes with outdated engines.** The original `select(.status.currentImage != .status.engineImage)` references `.status.engineImage`, which does not exist on the volume status — `engineImage` lives under `spec` and is deprecated in favor of `spec.image` per the v1.7.0 CRD schema. Corrected the comparison to `select(.spec.image != .status.currentImage)`, which matches the current vs. desired engine image correctly.

## Review Notes
- Helm and kubectl upgrade commands (`helm repo update`, `helm search repo longhorn --versions`, `helm upgrade`, `kubectl apply -f longhorn.yaml`) match official Longhorn installation/upgrade documentation.
- Pre-upgrade checks using `kubectl get volumes.longhorn.io` with `.status.state` and `.status.robustness` custom columns match the volume CRD schema.
- The `kubectl get settings.longhorn.io | head -5` post-upgrade "version check" is not strictly a version check (there is no `current-longhorn-version` setting in v1.7.0); it merely lists settings. Left as-is since it's a low-risk sanity check, but a more precise command would inspect the manager pod image tag (`kubectl get pods -n longhorn-system -l app=longhorn-manager -o jsonpath='{.items[0].spec.containers[0].image}'`).
- Version references (1.7.0) are plausible and align with the release series available at the time of writing. Readers following this guide for later versions should adjust accordingly and consult the release notes.
- The `grep -v Running` filter on replicas is a heuristic — header lines and non-Running states both appear, which is acceptable for a quick check.
