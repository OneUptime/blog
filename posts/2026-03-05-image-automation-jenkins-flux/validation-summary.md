# Validation Summary: How to Set Up Image Automation with Jenkins and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Flux ImageRepository, ImagePolicy, ImageUpdateAutomation, and Receiver resources
- Kubernetes Deployments and Secrets
- Jenkins Declarative Pipeline
- Docker image build, tag, login, and push workflow
- Amazon ECR authentication with IRSA

## Sources Consulted
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux CLI documentation for image status commands: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Jenkins Pipeline Jenkinsfile documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/

## Issues Found
- The timestamp tagging section said to configure the Jenkins Build Timestamp plugin, but the example generates the timestamp directly with Groovy. I changed the wording to say the pipeline generates a UTC timestamp using the sortable `yyyyMMddHHmmss` pattern.
- The Flux `ImageUpdateAutomation` `messageTemplate` iterated over `.Changed.Objects` as if each item directly exposed `.Kind`, `.Name`, `.OldValue`, and `.NewValue`. Current Flux documentation shows `.Changed.Objects` as a map from resource identifiers to change lists. I updated the template to range over `$resource, $changes` and then over each `$change`.

## Review Notes
- The Flux CLI and kubectl binaries were not installed in the local review environment, so command verification was performed against official CLI documentation rather than local `--help` output.
- The Flux API examples use `image.toolkit.fluxcd.io/v1`, which matches the current Flux documentation for the image automation resources.
- The webhook Receiver secret uses the required `token` key, and the ImageRepository ECR `provider: aws` example aligns with Flux's documented AWS provider support for worker node IAM or IRSA.
