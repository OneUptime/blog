# Validation Summary: How to Use Ansible to Deploy to Container Registries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.docker collection
- Docker images and container registries
- Docker Hub
- AWS Elastic Container Registry
- AWS CLI
- Private container registries such as Harbor and Nexus

## Sources Consulted
- Ansible community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible community.docker.docker_login module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_login_module.html
- Ansible community.docker.docker_image_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_info_module.html
- AWS CLI ECR get-login-password documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- AWS CLI ECR create-repository documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html

## Issues Found
- The Docker Hub "Tag as latest" task did not actually create a `latest` tag. Updated it to tag the existing versioned image as `:latest`, push it, and use `force_tag: true` so an existing local `latest` tag can be updated.
- The private registry "Push additional tags" task attempted to push `latest`, branch, and SHA tags without first tagging them from the built versioned image. Updated it to use `repository` with each target tag and `force_tag: true`.
- The local image cleanup example split tags with `split(':')`, which breaks for image names that include a registry port such as `localhost:5000/app:tag`. Replaced it with regex-based tag extraction that preserves registry host ports.
- The ECR repository creation example used `--image-scanning-configuration scanOnPush=true`, which the current AWS CLI documentation marks as deprecated in favor of registry-level scanning configuration. Removed the deprecated option from the create command.
- The Common Use Cases introduction and infrastructure provisioning comment referred to "this module" even though the examples were broader Ansible workflows, not community.docker module examples. Updated the wording to avoid an inaccurate module reference.

## Review Notes
- The post uses `community.docker.docker_image`, which remains valid, but current community.docker documentation recommends the newer dedicated modules such as `docker_image_build`, `docker_image_push`, and `docker_image_tag` for more focused workflows.
- The YAML snippets were parsed successfully after the corrections.
