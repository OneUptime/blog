# Validation Summary: How to Integrate Flux CD with Jenkins for Image Building

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Flux ImageRepository, ImagePolicy, ImageUpdateAutomation, and Receiver APIs
- Jenkins Declarative Pipeline
- Jenkins Docker Pipeline plugin
- Kubernetes manifests and kubectl
- Docker/container registries
- GitOps deployment workflows

## Sources Consulted
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux sortable image tags guide: https://v2-7.docs.fluxcd.io/flux/guides/sortable-image-tags/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins download/LTS documentation: https://www.jenkins.io/download/

## Issues Found
- The prerequisites said only that Flux CD must be installed. Flux image automation requires the image-reflector-controller and image-automation-controller components, which are not installed by default in all Flux bootstrap setups. Updated the prerequisite to call out those components explicitly.
- The Jenkins prerequisites required the Kubernetes plugin even though the sample pipeline does not use it directly. Updated the wording so the Docker Pipeline plugin is required, while the Kubernetes plugin is only needed for Kubernetes-based Jenkins agents.
- The Jenkins Script Console example used `Jenkins.instance`. Updated it to `Jenkins.get()`, the current non-null accessor.
- The first Jenkinsfile attempted to derive `IMAGE_TAG` from `GIT_COMMIT` in the Declarative Pipeline `environment` block. That variable is only reliably available after checkout. Updated the pipeline to set `env.IMAGE_TAG` after `checkout scm` returns the commit metadata.
- The test stage used `make test || echo "No tests configured"`, which would hide real test failures. Updated it to skip only when no `Makefile` exists and otherwise let `make test` fail the build.
- The article suggested using a pure short commit SHA tag with an alphabetical Flux ImagePolicy. Flux does not select the latest image by registry build time, and commit SHA values do not sort chronologically. Updated the tag format to include the Jenkins build number and changed the policy to extract and numerically sort that build number.
- The semantic version example could produce invalid SemVer if `VERSION` contained a full `major.minor.patch` value and then appended another dot component. Updated the comments and variable names to make `VERSION` a `major.minor` prefix when the build number is used as the patch version.
- The Receiver webhook example used `/hook/jenkins-receiver` as if the path were name-based. Flux generates a unique webhook path and reports it in Receiver status. Added a command to retrieve `.status.webhookPath` and updated the Jenkins example to use the generated path.

## Review Notes
- The Flux API versions shown for image automation and notification resources are current as of this review.
- The `generic` Receiver type does not validate request authenticity; it uses the secret to generate the unique webhook path. For public endpoints, `generic-hmac` or a registry-specific receiver type would be more appropriate in a future security-focused revision.
