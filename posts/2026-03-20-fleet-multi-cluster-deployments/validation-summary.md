# Validation Summary: How to Set Up Fleet for Multi-Cluster Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- Helm

## Sources Consulted
- Fleet documentation: Register Downstream Clusters: https://fleet.rancher.io/0.14/cluster-registration
- Fleet documentation: Mapping to Downstream Clusters: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet documentation: `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet documentation: Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet documentation: Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet documentation: Namespaces: https://fleet.rancher.io/0.10/explanations/namespaces
- Rancher documentation: Registering Existing Clusters: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters

## Issues Found
- The Fleet API registration example used `ClusterRegistrationToken` incorrectly by reading a non-existent `.status.manifestNamespace` field. I changed it to the documented flow: wait for the generated Secret, decode `.data.values`, and use that `values.yaml`.
- The Fleet API registration example stopped before a cluster would actually register. I added the documented Helm install step for `fleet-agent` and clarified that this is the agent-initiated Fleet flow, not the same flow Rancher uses for **Import Existing**.
- The app `GitRepo` example comment said apps were deployed only to production, but the example targeted both `all-production` and `all-staging`. I corrected the comment and clarified that nested `fleet.yaml` files can still narrow targets per path.
- The staged rollout example explicitly set `paths: - /`; I removed that and relied on Fleet's documented default behavior where omitting `paths` targets the repo root.
- Several commands used less explicit Fleet resource names. I updated them to use full Fleet CRD resource names for labeling and status checks to avoid ambiguity.

## Review Notes
- The post is now technically consistent with Fleet's current `v1alpha1` CRDs and official documentation.
- Fleet's built-in partitioned rollout mechanism is configured through `rolloutStrategy` in `fleet.yaml`. This post's Step 6 demonstrates a valid staged promotion pattern using separate `GitRepo` resources instead.
