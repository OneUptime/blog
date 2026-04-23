# Validation Summary: How to Use Rancher Desktop for Local Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- Kubernetes
- k3s
- rdctl
- kubectl
- nerdctl
- Docker / Moby
- Helm

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Container Engine preferences: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop Working with Images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop bundled utilities: https://docs.rancherdesktop.io/references/bundled-utilities/
- Rancher Desktop 1.20.0 release notes (`rdctl reset` behavior and flags): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.20.0
- Bitnami NGINX Helm chart: https://bitnami.com/stack/nginx/helm

## Issues Found
- The prerequisites section stated 8 GB RAM and 4 CPU cores as hard requirements and claimed 16 GB was recommended. Official installation docs describe 8 GB RAM and 4 CPU as recommendations, not strict minimums, and do not state 16 GB as the default recommendation. I updated the wording accordingly.
- The post said administrative privileges were required for installation. Rancher Desktop docs show this is platform- and configuration-dependent, especially on Windows where privileged components may require admin access. I changed the prerequisite to reflect that nuance.
- The `rdctl` configuration examples used outdated or overly version-specific flags such as `--kubernetes-version`, `--container-engine`, and pinned Kubernetes version values. I replaced them with current documented settings keys such as `--kubernetes.enabled` and `--container-engine.name`.
- The "Common Configuration Tasks" section used inaccurate CLI commands: `rdctl factory-reset` was labeled as a Kubernetes reset, `rdctl status` is not a current documented command, and `rdctl list-settings | grep kubernetesVersion` does not match the current JSON structure. I replaced these with current Rancher Desktop commands that match current behavior.
- The troubleshooting section included a malformed log-path comment and shell pipelines using `grep`, which are not appropriate for a cross-platform Rancher Desktop guide. I replaced that content with the documented UI path for opening logs and current `rdctl reset --factory` usage.
- The Kubernetes walkthrough did not wait for the deployment to become ready before continuing. I added `kubectl rollout status deployment/hello-world` so the example is more reliable in practice.
- The initial setup section claimed `rdctl version` verified Rancher Desktop was installed and running, but that only confirms the CLI is installed. I added `rdctl list-settings` to verify the application is actually running.

## Review Notes
- Rancher Desktop documents `rdctl` as experimental, so command names and flags may change across releases. The post now reflects current documentation as of 2026-04-23, but future periodic revalidation is warranted.
- The Helm example remains valid, though Bitnami also supports OCI-based chart installation; the repository-based workflow used in the post still works.
