# Validation Summary: How to Build a Complete CI/CD Pipeline with GitLab CI and Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- GitLab CI/CD
- GitLab Container Registry
- GitLab project access tokens and deploy tokens
- Kubernetes
- Docker-in-Docker
- GitOps

## Sources Consulted
- Flux GitLab bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/gitlab/
- Flux `flux bootstrap gitlab` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_gitlab/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux `flux get images policy` command reference: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux `flux events` command reference: https://fluxcd.io/flux/cmd/flux_events/
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab tag pipeline documentation: https://docs.gitlab.com/user/project/repository/tags/
- GitLab deploy token documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab project access token documentation: https://docs.gitlab.com/user/project/settings/project_access_tokens/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The Deployment manifest used a Flux image automation marker and said Flux Image Automation would update the image, but the guide's deployment flow has GitLab CI update the fleet repository and does not define an ImageUpdateAutomation resource. I changed the comment and image line so the field is updated by the GitLab CI `update-fleet` job.
- The guide created workloads in the `myapp` namespace without ensuring that namespace exists. Flux Kustomization `targetNamespace` does not create the namespace automatically, so I added a `Namespace` manifest to the application deployment example.
- The GitLab CI Docker-in-Docker example omitted the documented Docker daemon connection variables and used floating Docker image tags. I updated it to pin Docker images and set `DOCKER_HOST`, `DOCKER_TLS_CERTDIR`, and the service health check port for a TLS-disabled DinD setup.
- The `docker login` example passed the registry password on the command line. I changed it to use `--password-stdin`.
- The `update-fleet` job used a GitLab deploy token to push back to the fleet repository, but GitLab deploy tokens only support read-only repository Git access. I changed the example to use a project access token with `write_repository` scope.
- The Step 5 heading said "Image Automation" even though the remaining resources only scan and select image tags through ImageRepository and ImagePolicy. I changed the heading to "Image Policy Monitoring."
- A best-practice bullet referred to approvals for "Flux Bot commits" even though this guide uses GitLab CI to commit fleet changes. I changed it to recommend protected branches with merge requests or restricted push permissions.
- The bootstrap sentence mentioned a deploy key while the shown command uses `--token-auth` with a GitLab personal access token. I changed the sentence to match the command.

## Review Notes
- The Flux CLI was not installed in the local environment, so CLI verification was performed against official Flux command documentation rather than local `--help` output.
- The GitLab CI configuration still uses `only`, which GitLab continues to support, though `rules` is the more flexible modern option.
