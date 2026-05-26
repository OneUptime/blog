# Validation Summary: How to Pull Docker Images with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker collection
- Docker images and registries
- Docker Hub
- Google Artifact Registry
- GitHub Container Registry
- Amazon ECR
- Ansible Vault

## Sources Consulted
- Ansible community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible community.docker.docker_image_pull module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_pull_module.html
- Ansible community.docker.docker_login module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_login_module.html
- Ansible community.docker.docker_image_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_info_module.html
- Ansible community.docker.docker_host_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_host_info_module.html
- Ansible community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Docker image prune documentation: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker image pull documentation: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker login documentation: https://docs.docker.com/reference/cli/docker/login/
- Google Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Container Registry shutdown guidance: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- GitHub Container Registry documentation: https://docs.github.com/packages/getting-started-with-github-container-registry/about-github-container-registry
- Amazon ECR AWS CLI examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- Kubernetes image registry migration announcement: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/

## Issues Found
- The prerequisites incorrectly said to install the Docker Python SDK with `pip install docker`. Current `community.docker` modules use collection-included Docker API code and list `requests` as the Python requirement, so the prerequisite was changed to `pip install requests`.
- The post described `source: pull` as always pulling from the registry. The module is idempotent by default and only pulls when the image is missing unless `force_source: true` is set, so the explanation and Mermaid diagram were corrected.
- The `source` parameter explanation omitted the supported `load` option. Added `load` to the diagram and bullet list.
- The examples referenced Google Container Registry and `gcr.io` paths. Container Registry is shut down for writes and Artifact Registry is the recommended service, so the examples were updated to Google Artifact Registry hostnames and image paths.
- The public registry example used the legacy `gcr.io/google-containers/busybox` path. Updated it to `registry.k8s.io/busybox`, consistent with Kubernetes registry migration guidance.
- The cleanup example defined a `keep_images` list but did not use it, which could mislead readers into thinking those images were protected. Removed the unused variable block.
- The digest best practice implied the main `docker_image` examples could use digest syntax without qualification. Updated it to note digest references where supported, including `community.docker.docker_image_pull` for pull-only playbooks.

## Review Notes
- Current `community.docker` documentation recommends the newer purpose-specific modules, such as `community.docker.docker_image_pull`, for pull-only workflows. The post still uses `community.docker.docker_image`, which remains documented and usable.
- The ECR example retrieves the login password with the AWS CLI and passes it to `docker_login`, which is consistent with AWS guidance for ECR authentication.
- The cleanup section's `dangling: false` example is intentionally aggressive: it removes all images not referenced by a container, matching Docker's `docker image prune -a` behavior.
