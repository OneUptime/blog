# Validation Summary: How to Install and Configure GitLab Runner on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- GitLab Runner
- GitLab CI/CD
- Shell executor
- Docker executor
- Docker-in-Docker
- Kubernetes executor
- Prometheus monitoring
- GitLab CI cache and artifacts

## Sources Consulted
- GitLab Runner Linux repository installation documentation: https://docs.gitlab.com/runner/install/linux-repository/
- GitLab Runner manual Linux installation documentation: https://docs.gitlab.com/runner/install/linux-manually/
- GitLab Runner registration documentation: https://docs.gitlab.com/runner/register/
- GitLab Runner executors documentation: https://docs.gitlab.com/runner/executors/
- GitLab Runner Docker executor documentation: https://docs.gitlab.com/runner/executors/docker/
- GitLab Runner Kubernetes executor documentation: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Runner advanced configuration documentation: https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Runner feature flags documentation: https://docs.gitlab.com/runner/configuration/feature-flags/
- GitLab Runner monitoring documentation: https://docs.gitlab.com/runner/monitoring/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The post used deprecated runner registration tokens and `--registration-token` examples as the primary registration flow. Updated the text and command examples to use runner authentication tokens with `--token`, and noted that registration tokens are deprecated and scheduled for removal in GitLab 20.0.
- Several registration examples set tags, locked status, and untagged-job behavior through deprecated registration-token options. Removed those flags from authentication-token registration examples and clarified that these settings are configured when creating the runner in the GitLab UI or API.
- The executor table omitted newer autoscaling executor terminology and presented Docker+Machine without a deprecation caveat. Added Docker Autoscaler and Instance executor entries and marked Docker+Machine as deprecated.
- The installation verification example pinned an outdated-looking GitLab Runner version and build metadata. Made the expected output generic so it remains correct across current releases.
- The shell executor security example added `gitlab-runner` to the `sudo` group. Removed that command because it unnecessarily expands runner job privileges.
- The Kubernetes executor TOML used `image_pull_policy`, but GitLab Runner documents `pull_policy` for Kubernetes executor image pull policy configuration. Replaced it with `pull_policy = "if-not-present"`.
- The Kubernetes executor TOML included a `bearer_token` key, while current docs use the `KUBERNETES_BEARER_TOKEN` variable for this flow and require a `host` setting when using it. Removed the misleading key from the static configuration example.
- The artifact configuration example used `[runners.custom_build_dir]` while describing artifact size handling. Replaced it with the current `[runners.artifact]` upload timeout settings.
- The environment hook example used older `pre_clone_script` and `pre_build_script` keys. Replaced them with current `pre_get_sources_script` and `post_get_sources_script` examples.
- The timeout troubleshooting example used `clone_url` as if it configured clone timeout. Replaced it with a job-level `.gitlab-ci.yml` `timeout` example and kept `wait_for_services_timeout` specifically for Docker service startup.

## Review Notes
- The post is technically relevant and remains useful after correction.
- The Kubernetes RBAC examples are intentionally broad for a tutorial. For production, users should tailor permissions to the exact GitLab Runner features enabled in their environment.
