# Validation Summary: How to Install Fleet in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- Helm
- GitOps

## Sources Consulted
- Rancher docs: Continuous Delivery with Fleet overview - https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher docs: Continuous Delivery feature flag - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery
- Rancher docs: Enabling Experimental Features - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-experimental-features
- Fleet docs: Installation Details - https://fleet.rancher.io/how-tos-for-operators/installation
- Fleet docs: Register Downstream Clusters - https://fleet.rancher.io/how-tos-for-operators/cluster-registration
- Fleet docs: Configuration Reference - https://fleet.rancher.io/reference/ref-configuration

## Issues Found
- The prerequisites mixed Rancher-only and standalone requirements. I clarified that Rancher and Rancher-registered downstream clusters are only required for the Rancher-integrated workflow, while standalone Fleet only requires a Kubernetes management cluster.
- The architecture section described the Fleet manager as always running in the Rancher local cluster. I corrected this to the more general and accurate management-cluster wording because the post also covers standalone Fleet.
- The Rancher UI section referenced `Continuous Delivery > Advanced > Settings` for configuration. I replaced this with the documented Continuous Delivery workspace flow and the correct `continuous-delivery` feature-flag guidance.
- The standalone Helm install used `--set apiServerURL=...` on the default Fleet manager installation. I removed that setting and switched the commands to the documented default install flow with `--wait`, because API server settings are only required for specific multi-cluster manager-initiated scenarios.
- The downstream agent section incorrectly used `fleet-controller-bootstrap-token`, `--set token=...`, and `--set clusterNamespace=...` as the primary bootstrap flow. I replaced that with the official agent-initiated registration flow: create a `ClusterRegistrationToken`, extract `values.yaml`, then install `fleet-agent` with `apiServerURL` and `apiServerCA`.
- The Rancher feature-flag section used the wrong feature name and an unsupported `kubectl patch feature fleet` example. I corrected the post to reference the actual Rancher `continuous-delivery` feature flag and its documented UI/API control path.
- The complete verification step checked clusters only in `fleet-local`, which was too narrow for a post that also covers standalone and remote cluster registration. I changed the command to `kubectl get clusters.fleet.cattle.io -A`.
- The TLS troubleshooting section referenced `fleet-controller-bootstrap-token` as the CA source. I replaced it with API server reachability and CA validation commands that align with the documented Fleet API server URL/CA configuration flow.

## Review Notes
The post now reflects the documented Rancher-integrated UI workflow and the standalone, agent-initiated downstream registration flow. Fleet also supports manager-initiated downstream registration, but that is a different setup and is not covered in this article.
