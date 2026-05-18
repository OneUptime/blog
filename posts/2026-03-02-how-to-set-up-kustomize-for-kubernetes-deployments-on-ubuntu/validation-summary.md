# Validation Summary: How to Set Up Kustomize for Kubernetes Deployments on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kustomize (CLI, v5.x)
- Kubernetes (Deployment, Service, ConfigMap, Secret, HorizontalPodAutoscaler)
- kubectl (with `-k` and `kustomize` subcommands)
- Ubuntu (Linux installation)
- GitLab CI (CI/CD integration example)
- Prometheus ServiceMonitor (mentioned in components example)

## Sources Consulted
- Kustomization Reference (sigs.k8s.io): https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Kustomize Components guide: https://kubectl.docs.kubernetes.io/guides/config_management/components/
- Kustomize releasing docs: https://github.com/kubernetes-sigs/kustomize/blob/master/releasing/README.md
- Kustomize image transformer examples: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/image.md
- Kustomize repo tag-naming discussion (issue #4601): https://github.com/kubernetes-sigs/kustomize/issues/4601
- `commonLabels` deprecation discussion (issue #5726): https://github.com/kubernetes-sigs/kustomize/issues/5726
- Kubernetes HorizontalPodAutoscaler API reference (autoscaling/v2 GA in 1.23+)

## Issues Found
1. **Unreliable version-detection script (fixed).** The original install snippet used `https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest` to pick up the Kustomize CLI version. The `kubernetes-sigs/kustomize` repo releases multiple subprojects (`kustomize`, `kyaml`, `cmd/config`, `api`) under separate tag prefixes, and GitHub's `releases/latest` returns whichever single release is most recent overall — which is frequently `kyaml/...`, not `kustomize/...`. In that case the `grep 'kustomize'` filter silently produces an empty version and the subsequent `curl` builds a broken URL. Replaced with the documented pattern: list `/releases?per_page=100`, filter for tags starting with `kustomize/v`, and take the first match.

## Review Notes
- `commonLabels` is used throughout the overlays. It still works in Kustomize 5.x but is officially deprecated in favor of the newer `labels:` field (with `pairs`, `includeSelectors`, `includeTemplates`). `kustomize edit fix` can migrate automatically. Left as-is since the deprecated field is still functional and the post's examples remain valid; worth modernizing in a future revision.
- `commonLabels` adds labels to both pod templates AND selectors. The dev/prod overlays adding `environment: dev`/`environment: production` via `commonLabels` will cause selector changes that are immutable on existing Deployments — re-deploying the same manifest to a different environment of an already-deployed Deployment will fail. This is correct for greenfield deployment (the scenario in the post) but readers should be aware when modifying selectors later.
- All other technical claims are accurate: download URL pattern, `autoscaling/v2` HPA, `kustomize.config.k8s.io/v1beta1` Kustomization / `v1alpha1` Component apiVersions, `configMapGenerator`/`secretGenerator` syntax (`behavior: merge`, `options.disableNameSuffixHash`), `kustomize edit set image` syntax, `kustomize version` command, and `patches:` auto-detection of JSON 6902 operations when a `target:` is specified.
- The `kubectl rollout status deployment/myapp -n myapp-staging` line in the GitLab CI snippet is correct and works against the `myapp-staging` namespace produced by a staging overlay (the post sets `myapp-dev` and `myapp-production` namespaces, leaving readers to define staging similarly).
