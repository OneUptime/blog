# Validation Summary: How to Configure Rancher Turtles for Air-Gapped Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Rancher Manager
- Cluster API (CAPI)
- Cluster API Operator
- CAPIProvider
- Air-gapped Kubernetes operations
- ORAS

## Sources Consulted
- Rancher Turtles Air-Gapped Environment: https://turtles.docs.rancher.com/turtles/stable/en/operator/airgapped.html
- Rancher Turtles CAPIProvider reference: https://turtles.docs.rancher.com/turtles/stable/en/reference/capiprovider.html
- Rancher Turtles Rancher Cluster Registration: https://turtles.docs.rancher.com/turtles/stable/en/user/rancher-cluster-registration.html
- Rancher Turtles Troubleshooting: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Rancher Turtles Cluster Resource Relationships: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Manager Cluster API overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/cluster-api/overview
- Cluster API Operator air-gapped environment guide: https://cluster-api-operator.sigs.k8s.io/topics/configuration/air-gapped-environtment
- Cluster API `clusterctl` commands: https://cluster-api.sigs.k8s.io/clusterctl/commands/commands

## Issues Found
- The post title and description promised an air-gapped Rancher Turtles guide, but the original body used a generic `Cluster` example that did not configure air-gapped provider installation at all. I replaced it with the documented `CAPIProvider` workflow that Rancher Turtles uses for air-gapped environments.
- The original YAML used a placeholder `InfraCluster` kind and an `RKE2ControlPlane` reference without a matching, provider-specific resource set. That manifest was not a working Rancher Turtles air-gap example, so I removed it and substituted a validated `CAPIProvider` manifest using `fetchConfig.oci`.
- The original verification command `kubectl get providers -A` did not match the Rancher Turtles API described in current documentation. I replaced it with explicit `capiproviders.turtles-capi.cattle.io` queries.
- The original import-status check used `cluster.provisioning.cattle.io -n fleet-default`, which is not the recommended or reliable object to inspect in modern Rancher Turtles workflows. I replaced it with `clusters.management.cattle.io`, which is what Turtles creates during supported auto-import.
- The original post did not explain the required air-gap image path behavior. I added the documented requirement that mirrored provider images must be reachable internally, and clarified the role of Rancher's `system-default-registry` when using automatic registry rewriting.
- The troubleshooting section used outdated namespaces for current Rancher-installed Rancher Turtles components. I updated the log commands to the documented `cattle-turtles-system` and `cattle-capi-system` namespaces, while keeping the provider-specific namespace example.
- The original scaling example was disconnected from the manifest shown and was not specific to the air-gapped setup being described. I replaced the "Common Operations" section with provider mirroring, provider version updates, and workload kubeconfig retrieval.

## Review Notes
- The corrected post assumes the default namespaces used when Rancher Turtles is installed as part of Rancher. Manual Helm installations can use different namespaces such as `rancher-turtles-system`.
- The OCI example assumes provider controller images are also mirrored to the internal registry. If mirrored image paths do not preserve upstream naming, additional image overrides may still be required.
