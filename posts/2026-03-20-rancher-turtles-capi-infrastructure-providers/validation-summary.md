# Validation Summary: How to Configure CAPI Infrastructure Providers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Rancher
- Cluster API (CAPI)
- Cluster API Operator
- Kubernetes
- `CAPIProvider` custom resources

## Sources Consulted
- Rancher Turtles: Rancher Setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles: CAPI Provider reference: https://turtles.docs.rancher.com/turtles/stable/en/reference/capiprovider.html
- Rancher Turtles: Rancher Cluster Registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles: Cluster Resource Relationships in Rancher Turtles: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles: Troubleshooting: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Cluster API Operator: Provider List: https://cluster-api-operator.sigs.k8s.io/reference/providers
- Cluster API Book: Version Support: https://main.cluster-api.sigs.k8s.io/reference/versions.html
- Rancher Manager docs: Cluster API overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/cluster-api/overview

## Issues Found
- The post used the old `rancher-turtles-system` namespace. I corrected it to `cattle-turtles-system`, which is the current namespace documented for Rancher Turtles in supported Rancher/Turtles workflows.
- The `kubectl get providers -A` command did not match the current Rancher Turtles provider configuration model. I replaced it with `kubectl get capiproviders.turtles-capi.cattle.io -A`, which reflects the supported `CAPIProvider` API.
- The main YAML example was not a valid infrastructure-provider configuration. It used a placeholder `InfraCluster` kind, a broken generic `Cluster` manifest, and an outdated `RKE2ControlPlane` API version reference. I replaced it with a valid `CAPIProvider` example, which is the documented way to configure infrastructure providers with Rancher Turtles.
- The verification step checked `clusters.provisioning.cattle.io` in `fleet-default`, but current Rancher Turtles workflows use `clusters.management.cattle.io` for imported clusters and do not rely on `provisioning.cattle.io` in the normal path. I updated the verification/UI guidance accordingly.
- The original "Common Operations" and "Troubleshooting" sections were focused on workload-cluster lifecycle commands rather than provider configuration. I replaced them with provider-centric commands for pinning versions, inspecting `CAPIProvider` resources, checking generated `InfrastructureProvider` resources, and reviewing provider-controller logs.
- The prerequisites implied infrastructure providers were already installed, which is circular for a provider-configuration guide. I changed that prerequisite to require Cluster API core components on the management cluster instead.

## Review Notes
- Provider-specific secrets, variables, and controller namespaces still vary by provider. AWS, Azure, vSphere, and Docker do not share identical credential requirements, so readers still need the corresponding provider documentation when filling `configSecret` data or selecting namespaces such as `capa-system`, `capz-system`, or `capv-system`.
- Current Cluster API documentation shows the project moving on the `v1beta2` contract, with temporary compatibility for some providers still on `v1beta1`. This is another reason the original generic manifest was not safe to keep.
