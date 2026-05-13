# Validation Summary: How to Set Up GitLab CI for Flux Manifest Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CLI and Flux Kustomizations
- Kubernetes manifests and Kustomize
- GitLab CI/CD and merge request pipelines
- kubeconform
- yamllint

## Sources Consulted
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux `flux check` command documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux `flux build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kubeconform README and usage documentation: https://github.com/yannh/kubeconform
- kubeconform installation documentation: https://kubeconform.mandragor.org/docs/installation/
- Kustomize official documentation: https://kustomize.io/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GitLab merge request pipelines documentation: https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab merge checks and Pipelines must succeed documentation: https://docs.gitlab.com/user/project/merge_requests/merge_when_pipeline_succeeds/

## Issues Found
- The basic pipeline job was named `validate-manifests` and described as manifest validation, but `flux check --pre` checks Flux prerequisites and the configured Kubernetes context rather than validating repository manifests. Renamed the job to `flux-pre-check` and clarified the explanation.
- The GitLab `rules: changes` examples did not explicitly target merge request pipelines. Added `if: '$CI_PIPELINE_SOURCE == "merge_request_event"'` to the relevant rules so the examples match GitLab's merge request pipeline requirements.
- The post stated that GitLab CI artifacts add pipeline results as merge request comments. Artifacts preserve job output for download and review, but they do not post comments by themselves. Updated the section to describe validation artifacts instead.

## Review Notes
- The kubeconform flags and schema locations are valid, including use of `default`, `-strict`, `-ignore-missing-schemas`, and CRD schema lookup through the CRDs catalog.
- The Kustomize build commands are valid for repositories that use standard `kustomization.yaml` files. Repositories that rely on Flux-specific post-build substitution may need additional Flux CLI checks in the future.
- `FLUX_VERSION: "2.2.0"` and `KUBECONFORM_VERSION: "0.6.4"` are valid historical versions, but they are old relative to current releases and should be updated before using this pipeline as a new production baseline.
