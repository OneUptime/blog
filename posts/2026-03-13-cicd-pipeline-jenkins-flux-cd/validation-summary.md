# Validation Summary: How to Build a Complete CI/CD Pipeline with Jenkins and Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins Pipeline
- Jenkins Docker Pipeline plugin
- Flux CD
- Flux image reflector and image automation controllers
- Kubernetes Deployments
- GitOps
- Docker/container registries

## Sources Consulted
- Flux bootstrap GitHub command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux `get image update` command documentation: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/

## Issues Found
- The bootstrap command did not enable Flux's optional image automation controllers, but the post used Flux image automation resources and image policy markers. Added `--components-extra=image-reflector-controller,image-automation-controller` and noted the extra controllers in the prerequisites.
- The bootstrap command did not grant Flux write access to the Git repository, which is required when Flux image automation commits updates back to Git. Added `--read-write-key`.
- The workflow mixed two competing update mechanisms: Jenkins edited the fleet repository directly, while the post also configured Flux image automation. Removed the Jenkins fleet-repository update stage and made Flux image automation responsible for committing image updates.
- The Flux image policy marker in the Deployment had no `ImageUpdateAutomation` resource to act on it. Added an `ImageUpdateAutomation` manifest that uses the `Setters` strategy against `./apps/myapp`.
- The Jenkins tag trigger used `v*` release tags while the Flux semver policy selected tags with a `>=1.0.0` range. Updated the Jenkins image tag calculation to strip the leading `v`, so pushed image tags match the policy range.
- The verification steps did not check the image automation resource. Added `flux get image update myapp`.
- Best-practice guidance referred to Jenkins fleet-repository credentials and Jenkins-based Kubernetes checks even though the corrected workflow no longer gives Jenkins fleet-repository or Kubernetes access. Updated those bullets to refer to Flux's Git write access, Jenkins build/publish standardization, and verification from a trusted environment.
- The bootstrap explanation incorrectly described Flux as creating "GitRepository and Kustomization controllers." Updated it to describe installed controllers and repository synchronization more accurately.

## Review Notes
- The corrected workflow assumes Flux image automation is allowed to push directly to `main`. In production, many teams prefer pushing to an automation branch and merging by pull request or policy-controlled automation.
- The registry pull secret referenced by `ImageRepository.spec.secretRef.name` must exist in the `flux-system` namespace and contain credentials in a format supported by the image reflector controller.
