# Validation Summary: How to Configure Helm Chart Repositories with Authentication and TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm chart repositories
- Helm OCI registries
- Kubernetes Secrets
- ChartMuseum
- Harbor
- JFrog Artifactory
- TLS and client certificates
- HTTP Basic authentication and access tokens

## Sources Consulted
- Helm `repo add` command documentation: https://helm.sh/docs/helm/helm_repo_add/
- Helm `registry login` command documentation: https://helm.sh/docs/helm/helm_registry_login/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm `install` command documentation: https://helm.sh/docs/helm/helm_install/
- ChartMuseum official documentation: https://chartmuseum.com/docs/
- ChartMuseum configuration keys: https://github.com/helm/chartmuseum/blob/main/pkg/config/vars.go
- Harbor Helm chart repository: https://github.com/goharbor/harbor-helm
- Harbor 2.8 release notes for ChartMuseum removal: https://goharbor.io/blog/harbor-2.8/
- Harbor Helm chart values: https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- JFrog Artifactory Helm repository documentation: https://docs.jfrog.com/artifactory/docs/kubernetes-helm-chart-repositories
- JFrog Helm OCI / CLI documentation: https://docs.jfrog.com/artifactory/docs/jf-helm

## Issues Found
- Corrected the explanation of where Helm stores repository configuration. Helm uses `~/.config/helm/repositories.yaml` and repository cache files, not kubeconfig contexts.
- Corrected the credential storage claim. Helm stores repository username and password values in the repository config; the post should not describe them as encoded credentials.
- Removed the unsupported suggestion that Helm chart repositories use generic credential helpers, replacing it with environment variables or secrets manager guidance.
- Replaced the ChartMuseum YAML example with documented file configuration keys such as `storage.backend`, `storage.local.rootdir`, `basicauth.user`, `basicauth.pass`, `bearerauth`, `authrealm`, `authservice`, and `authcertpath`.
- Removed the bcrypt / multiple-user ChartMuseum basic-auth example because the documented ChartMuseum server options accept a basic-auth username and password, not that nested user-list format.
- Updated the Harbor section for modern Harbor. Harbor 2.8 and later removed ChartMuseum, so the post now uses Harbor as an OCI registry for Helm charts instead of adding `/chartrepo/...` as a classic Helm repository.
- Removed obsolete Harbor chart values for `chartmuseum.enabled` and `persistence.persistentVolumeClaim.chartmuseum`.
- Clarified bearer-token usage. Classic `helm repo add` uses HTTP Basic credentials; true bearer-style token workflows are provider-specific for classic repositories and are standard for OCI registry login.
- Corrected Artifactory Helm repository URLs to use `/artifactory/api/helm/<repo-key>`, matching JFrog documentation.
- Replaced the unsupported Artifactory "credentials helper" shell script with `--password-stdin`.
- Fixed the GitLab CI `helm repo add` example so the multi-line command includes shell continuation characters.
- Replaced the unsupported ChartMuseum audit-log configuration with documented structured logging keys.

## Review Notes
The local environment did not have the `helm` binary installed, so CLI flag verification was performed against official Helm command documentation rather than local `helm --help` output.
