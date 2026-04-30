# Validation Summary: How to Configure Fleet Git Repositories

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- Git
- kubectl
- YAML

## Sources Consulted
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Git Repository Contents: https://fleet.rancher.io/explanations/gitrepo-content
- SUSE Rancher Prime Continuous Delivery GitRepo Resource v0.15: https://documentation.suse.com/cloudnative/continuous-delivery/v0.15/en/reference/ref-gitrepo.html
- SUSE Rancher Prime Continuous Delivery Create a GitRepo Resource v0.15: https://documentation.suse.com/cloudnative/continuous-delivery/v0.15/en/how-tos-for-users/gitrepo-add.html
- SUSE Rancher Prime Continuous Delivery Mapping to Downstream Clusters v0.15: https://documentation.suse.com/cloudnative/continuous-delivery/v0.15/en/how-tos-for-users/gitrepo-targets.html

## Issues Found
- The post used `fleet-default` throughout without clarifying that single-cluster Fleet installs typically use `fleet-local`. I added a short note so the examples are scoped correctly for Rancher-managed versus single-cluster setups.
- The status-condition descriptions were partly inaccurate. I corrected `Ready` to reflect desired/current state matching, `Stalled` to reflect controller errors or lack of progress, and `GitPolling` to reflect successful polling or disabled polling rather than "actively polling."
- The delete section implied cleanup is unconditional. I corrected it to note that resource cleanup is the default behavior unless `keepResources: true` is set.

## Review Notes
- The YAML fields and CLI commands in the post match current Fleet documentation, including `apiVersion: fleet.cattle.io/v1alpha1`, `branch`, `revision`, `paths`, `targets`, and `pollingInterval`.
- Fleet documentation still presents `GitRepo` as `fleet.cattle.io/v1alpha1` as of the review date, so the API shown in the post is current.
