# Validation Summary: Rancher Fleet vs ArgoCD: GitOps Comparison

## Status
validated

## Post Type
Guide / comparison

## Technologies Covered
- Rancher Fleet
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize

## Sources Consulted
- SUSE Rancher Manager Fleet Overview: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/integrations/fleet/overview.html
- Fleet Architecture: https://fleet.rancher.io/explanations/architecture
- Fleet GitRepo Resource: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Git Repository Contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet Rollout Strategy: https://fleet.rancher.io/how-tos-for-users/rollout
- Argo CD Overview: https://argo-cd.readthedocs.io/en/stable/
- Argo CD Architectural Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD User Management: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Notifications Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD High Availability: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD Feature Maturity: https://argo-cd.readthedocs.io/en/stable/operator-manual/feature-maturity/
- Argo CD Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/

## Issues Found
- The feature table described Fleet as push-based and Argo CD as push-and-pull. I corrected this to match the documented architectures: Fleet uses a two-stage pull model, and Argo CD's controller pulls from Git and reconciles to clusters.
- The original scale guidance used unsupported fixed numbers and implied Argo CD should be limited to smaller cluster counts. I replaced that wording with documentation-backed scale guidance: Fleet is documented as GitOps at scale, while Argo CD documents controller sharding and HA tuning for larger footprints.
- The Fleet architecture text said bundles target clusters by namespaces. I corrected this to selectors, cluster groups, or cluster names, which matches `GitRepo.spec.targets`.
- The Argo CD architecture diagram was misleading because it skipped the repo server and implied the API server sat in the deployment path. I corrected the diagram and explanatory text to reflect Argo CD's documented component responsibilities.
- The progressive delivery comparison said both tools had no support. I corrected this to note Fleet's cluster rollout strategy and Argo CD's hooks plus experimental Progressive Syncs, while still noting that Argo Rollouts is the dedicated workload progressive delivery tool.

## Review Notes
- The Fleet `GitRepo` YAML example is syntactically valid and uses current documented fields, including `apiVersion: fleet.cattle.io/v1alpha1`, `spec.branch`, `spec.paths`, and `spec.targets`.
- The Argo CD `Application` YAML example is syntactically valid and aligns with the documented `Application` spec, including `repoURL`, `targetRevision`, `path`, `destination`, and `syncPolicy.automated`.
- Argo CD's ApplicationSet Progressive Syncs are still documented as non-stable/experimental in current maturity docs, so wording that treats them as a full built-in progressive delivery replacement would be misleading.
