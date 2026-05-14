# Validation Summary: How to Use Flux CD with Score for Workload Specification

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Score specification
- score-k8s CLI
- Kubernetes manifests
- Flux CD Kustomization
- Flux image automation
- Flux notification alerts and providers
- GitHub Actions

## Sources Consulted
- Score specification reference: https://docs.score.dev/docs/score-specification/score-spec-reference/
- score-k8s CLI reference: https://docs.score.dev/docs/score-implementation/score-k8s/cli/
- score-k8s installation documentation: https://docs.score.dev/docs/score-implementation/score-k8s/installation/
- score-k8s resource provisioners documentation: https://docs.score.dev/docs/score-implementation/score-k8s/resources-provisioners/
- Score GitHub Actions setup documentation: https://docs.score.dev/docs/how-to/github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux image update automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image automation API reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux notification alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/

## Issues Found
- The Linux `score-k8s` download URL used a non-existent unversioned release asset. Updated it to the official versioned release asset pattern.
- The prerequisite Kubernetes version was stale for current Flux releases. Reworded it to require a Kubernetes version supported by the installed Flux version.
- Score resource examples used `properties`, which is not part of the Score resource schema. Removed those invalid fields and kept the resource declarations compatible with `score.dev/v1b1`.
- The custom `score-k8s` provisioner example used an invalid `apiVersion`/`kind`/`provisioners` wrapper and non-existent state helper syntax. Rewrote it as a root-level provisioner list with `outputs` templates, `expected_outputs`, and `encodeSecretRef` for secret-backed values.
- The post used the non-existent `score-k8s provisioners load` command. Replaced it with `score-k8s init --no-sample --provisioners ./score-k8s-provisioners.yaml`, which matches current CLI behavior.
- The GitHub Actions workflow manually downloaded an invalid release URL and did not create generated output directories. Replaced the install step with `score-spec/setup-score@v3` and added `mkdir -p` before writing manifests.
- The advanced Score example referenced an `elasticsearch` resource without noting that `score-k8s` needs a matching provisioner. Added the required caveat.
- Flux image automation was missing an `ImageRepository` and did not mark the Score image field for update. Added the `ImageRepository` resource and a `$imagepolicy` marker comment.
- The Flux image automation commit message template referenced unsupported fields (`.ImageName` and `.NewTag`). Replaced it with a simple valid message template.
- Flux notification examples used the wrong Alert field (`severity`) and an API version that does not currently cover Alert/Provider in the docs. Updated Alert and Provider manifests to `notification.toolkit.fluxcd.io/v1beta3` and changed the field to `eventSeverity`.
- Troubleshooting and best-practice sections referenced the non-existent `score-k8s run --dry-run` command. Replaced it with a manifest generation command that validates the Score file by exercising `score-k8s generate`.

## Review Notes
Verified the main Score workload and provisioner example by running `score-k8s` 0.13.0 in a temporary directory; manifest generation completed successfully. Also parsed all YAML snippets in the post after edits.
