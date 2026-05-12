# Validation Summary: How to Implement Right-Sizing Automation with Flux CD

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes Vertical Pod Autoscaler (VPA)
- Goldilocks
- Flux CD (Kustomization controller)
- GitOps
- GitHub Actions
- kubectl / jq
- Kustomize strategic merge patches and JSON6902 patches
- peter-evans/create-pull-request action

## Sources Consulted
- Kubernetes VPA API types: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go (semantics of `lowerBound`, `target`, `upperBound`, `uncappedTarget` in `containerRecommendations`)
- Kubernetes VPA documentation: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler (`autoscaling.k8s.io/v1` API version, `updateMode: "Off"` recommendation-only mode, `resourcePolicy.containerPolicies` fields)
- Flux CD Kustomization API v1: https://fluxcd.io/flux/components/kustomize/kustomizations/ (`kustomize.toolkit.fluxcd.io/v1`, `patches` with `target` selector supporting JSON6902 ops)
- GitHub Actions documentation: `actions/checkout@v4`, `azure/setup-kubectl@v3`, `peter-evans/create-pull-request@v6`, `github.run_started_at` context variable, cron schedule syntax
- Kubernetes label key syntax (DNS-subdomain prefix `right-sizing/managed`)

## Issues Found
- **Incorrect VPA recommendation field guidance for memory limits.** The "Best Practices" section originally read: *"Use the 'lower bound' VPA recommendation rather than 'target' for memory limits; target recommendations can be too close to peak usage, risking OOMKills."* This is technically backwards. By definition `lowerBound <= target <= upperBound`, so `lowerBound` provides *less* headroom than `target`, which would *increase* OOMKill risk, not reduce it. To avoid OOMKills you need *more* headroom above peak usage, which means `upperBound`. Changed "lower bound" to "upper bound" so the advice now matches the stated reasoning and the VPA field semantics.

## Review Notes
- The extractor script uses `containerRecommendations[0]`, which only handles the first container per pod. This works for single-container Deployments (the post's example) but would silently skip recommendations for sidecars in multi-container pods. Not technically incorrect, just a limitation worth being aware of.
- The script only writes resource `requests` (not `limits`). That is consistent with VPA's primary use case and with the "Off" recommendation-only mode, but readers applying the "upper bound for memory limits" best practice would need to extend the script themselves to also emit `limits` from `containerRecommendations[].upperBound.memory`.
- `peter-evans/create-pull-request@v6` requires `pull-requests: write` (and usually `contents: write`) workflow permissions. The example relies on the default `GITHUB_TOKEN` and does not explicitly set `permissions:` at the job level; in repositories where the default token permissions are restricted, users will need to add a `permissions:` block. This is a configuration nuance rather than an error.
- `azure/setup-kubectl@v3` with `version: v1.29.0` is valid today; readers should bump to a current kubectl as their clusters upgrade.
- The Flux Kustomization example uses `path: ./apps` with `prune: true`, which would prune *all* resources under `./apps` that disappear from Git — not just VPAs. The "Only reconcile VPA objects" comment is a touch misleading: the `patches` block only restricts which objects get the JSON6902 patch applied, not which objects the Kustomization manages. Worth being aware of, but not a factual error in the YAML itself.
