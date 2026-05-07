# Validation Summary: How to Check Rancher Version Compatibility Before Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Manager / Rancher
- Kubernetes
- kubectl
- Helm
- cert-manager
- ingress-nginx
- Traefik
- kubent (Kube No Trouble)

## Sources Consulted
- SUSE Rancher Support Matrix: https://www.suse.com/suse-rancher/support-matrix/
- Rancher install/upgrade docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/install-rancher.html
- Rancher upgrade docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/upgrades.html
- Rancher Helm version requirements: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/requirements/helm-version-requirements.html
- Rancher global resources reference: https://documentation.suse.com/cloudnative/rancher-manager/v2.10/en/rancher-admin/users/authn-and-authz/manage-role-based-access-control-rbac/global-resources.html
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes deprecation policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes blog on deprecated API warnings and metrics: https://kubernetes.io/blog/2020/09/03/warnings/
- Helm `helm version` reference: https://docs.helm.sh/docs/helm/helm_version/
- Rancher cluster type definitions used to verify the downstream cluster JSONPath: https://raw.githubusercontent.com/rancher/rancher/release/v2.14/pkg/apis/management.cattle.io/v3/cluster_types.go

## Issues Found
- The post said the support matrix should be accessed from the Rancher documentation site. I changed this to the SUSE Rancher support matrix site, which is the authoritative compatibility source for current Rancher versions.
- The post used `kubectl version --short`. The current official `kubectl version` reference does not document `--short`, so I replaced it with `kubectl version`.
- The post described `kubectl get nodes -o wide` as a way to get the server version specifically. That command does not return the API server version, so I replaced it with `kubectl version -o yaml`.
- The cert-manager section stated that Rancher depends on cert-manager in general. I narrowed this to Rancher installs that use Rancher-generated or Let's Encrypt certificates, matching the current Rancher install docs.
- The Helm section implied a blanket Helm 3 requirement. I clarified that this applies to Helm-based Rancher installs and noted the documented Helm 2 deprecation in Rancher v2.7 and removal in Rancher v2.9.
- The deprecated API check used a broad grep pattern. I tightened it to match actual `apiserver_requested_deprecated_apis{...}` metric lines.
- The current-version command queried `settings` with `-n cattle-system`, but Rancher `settings.management.cattle.io` resources are global and non-namespaced. I corrected the command to use the fully qualified cluster-scoped resource without a namespace.
- The compatibility checklist always required a cert-manager version entry. I changed it to `compatible, if used` so it stays accurate for installs that use custom certificates or external TLS termination.

## Review Notes
- The downstream cluster command using `.status.version.gitVersion` was validated against Rancher’s cluster type definitions and did not need changes.
- Some commands in the post, such as `helm list -n cattle-system`, assume a Helm-based Rancher deployment. That is consistent with current Rancher upgrade documentation, but Docker-installed Rancher follows a different upgrade path.
- Exact supported Kubernetes, OS, runtime, and ingress combinations remain version-specific. Readers should always check the support matrix and release notes for the exact Rancher version they are targeting.
