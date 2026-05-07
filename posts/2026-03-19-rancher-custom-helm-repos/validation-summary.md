# Validation Summary: How to Add Custom Helm Chart Repositories in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Git
- OCI registries
- ChartMuseum

## Sources Consulted
- SUSE Rancher Manager: Helm Charts and Apps: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/cluster-admin/helm-charts-in-rancher/helm-charts-in-rancher.html
- SUSE Rancher Manager: Using OCI-Based Helm Chart Repositories: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/cluster-admin/helm-charts-in-rancher/oci-repositories.html
- SUSE Rancher Manager: Global Resources: https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/rancher-admin/users/authn-and-authz/manage-role-based-access-control-rbac/global-resources.html
- Rancher source: `pkg/apis/catalog.cattle.io/v1/types.go`: https://github.com/rancher/rancher/blob/main/pkg/apis/catalog.cattle.io/v1/types.go
- Rancher source: `pkg/crds/yaml/generated/catalog.cattle.io_clusterrepos.yaml`: https://github.com/rancher/rancher/blob/main/pkg/crds/yaml/generated/catalog.cattle.io_clusterrepos.yaml
- Rancher source: repository refresh controllers: https://github.com/rancher/rancher/blob/main/pkg/controllers/dashboard/helm/repo.go and https://github.com/rancher/rancher/blob/main/pkg/controllers/dashboard/helm/repo_oci.go
- Rancher Dashboard source: `shell/edit/catalog.cattle.io.clusterrepo.vue`: https://github.com/rancher/dashboard/blob/master/shell/edit/catalog.cattle.io.clusterrepo.vue
- Helm command docs: https://helm.sh/docs/helm/
- Helm `helm repo index` docs: https://helm.sh/docs/helm/helm_repo_index/
- ChartMuseum official repository and README: https://github.com/helm/chartmuseum

## Issues Found
- The post said Rancher supports only HTTP/HTTPS and Git repositories. I corrected this to include OCI repositories and noted that OCI repository support starts in Rancher v2.9.0.
- The Git repository instructions incorrectly stated a default branch of `main` and included a `Chart Path` field. Rancher uses the repository's default branch when `gitBranch` is omitted, and the current `ClusterRepo` spec does not expose a `chartPath` field, so I removed that field and corrected the branch behavior.
- The repository refresh section used `forceUpdate` as if it configured the periodic refresh interval. I replaced that with `refreshInterval`, noted that this capability is available in Rancher v2.10.0 and later, and kept manual refresh as a separate action.
- The disable instructions referred to a `Disabled` flag. Current Rancher uses `spec.enabled` for this behavior, so I corrected the instructions to set the `Enabled` field to `false` and added the v2.10.0 version note.
- The repository scope section claimed Rancher supports a namespace-scoped `Repo` resource for this feature. Current Rancher documentation and source define `ClusterRepo` for custom app repositories, so I replaced that section with the correct cluster-scoped behavior.
- The verification step referred to a `Status` column. Current Rancher documentation uses the `State` field for repository status, so I updated that wording.
- The prerequisites listed `Cluster admin or project owner access`, which was too specific for current Rancher permissions. I changed this to require permissions to manage repositories in the target cluster.

## Review Notes
- Common example Helm repository URLs in the post were checked directly and returned valid `index.yaml` endpoints as of 2026-05-07.
- Version-specific caveats matter for this topic: OCI repositories require Rancher v2.9.0 or later, while `refreshInterval` and repository enable/disable controls require Rancher v2.10.0 or later.
