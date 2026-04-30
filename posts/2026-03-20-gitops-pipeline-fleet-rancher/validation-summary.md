# Validation Summary: How to Set Up GitOps Pipeline with Rancher Fleet

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- GitOps
- Kubernetes
- Helm
- Kustomize
- `kubectl`

## Sources Consulted
- Rancher docs, Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher docs, Continuous Delivery feature flag: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery
- Fleet docs, GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet docs, Create a GitRepo resource: https://fleet.rancher.io/how-tos-for-users/gitrepo-add
- Fleet docs, `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet docs, Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet docs, Status fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet docs, List of deployed resources: https://fleet.rancher.io/reference/ref-resources
- Fleet docs, Create cluster groups: https://fleet.rancher.io/how-tos-for-operators/cluster-group

## Issues Found
- The prerequisites implied Fleet GitOps is always available in Rancher v2.6+. Rancher’s official docs note that Continuous Delivery can still be disabled with the `continuous-delivery` feature flag, so I changed the prerequisite to require Continuous Delivery to be enabled.
- The repository tree did not match the Helm-based `fleet.yaml` example. The original structure showed raw manifests and overlays, while the configuration referenced `helm.chart: ./chart` and `valuesFiles`. I updated the tree so it includes `chart/`, chart templates, and an extra Fleet-managed `values.yaml`.
- The `valuesFiles` comment implied it was the chart’s base `values.yaml`. Fleet’s current docs state the chart’s own `values.yaml` is already used automatically, so I changed the wording to describe it as an additional values file passed by Fleet.
- The monitoring section assumed the Bundle name would be `my-app-gitops`. Fleet generates bundle names from the GitRepo name and path, and long names may be truncated, so I changed the command to first list Bundles and then describe the generated name.
- The private repository authentication examples created generic Opaque secrets. Fleet’s GitRepo reference requires `clientSecretName` secrets to be `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`, so I corrected both commands and aligned the SSH `known_hosts` example with the official docs.
- The troubleshooting section used an annotation-based force-sync example that is not documented in the current official references I checked. I replaced it with a documented `spec.forceSyncGeneration` patch example and noted that the value must be incremented for later manual re-syncs.

## Review Notes
- After these corrections, the post is technically accurate against the current Rancher and Fleet documentation, and the `fleet.cattle.io/v1alpha1` API usage remains current in the official references.
- Rancher’s Fleet docs note that user-defined Git credential secrets are not backed up by default in Fleet backup and restore workflows. That is not an error in the post, but it is a relevant operational caveat for future revisions.
