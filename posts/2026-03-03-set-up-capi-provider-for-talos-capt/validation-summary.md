# Validation Summary: How to Set Up CAPI Provider for Talos (CAPT)

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Cluster API (CAPI)
- Cluster API Bootstrap Provider Talos (CABPT)
- Cluster API Control Plane Provider Talos (CACPPT)
- Talos Linux
- clusterctl CLI
- kubectl
- Kubernetes (management cluster)
- Cluster API Provider AWS (CAPA) / clusterawsadm
- Cluster API Provider Azure (CAPZ)
- Cluster API Provider vSphere (CAPV)

## Sources Consulted
- CABPT GitHub releases — https://github.com/siderolabs/cluster-api-bootstrap-provider-talos/releases (verified v0.6.5, v0.6.6, v0.6.12 exist; namespace `cabpt-system`, deployment `cabpt-controller-manager`)
- CACPPT GitHub releases — https://github.com/siderolabs/cluster-api-control-plane-provider-talos/releases (verified v0.5.6, v0.5.7, v0.5.13 exist; namespace `cacppt-system`, deployment `cacppt-controller-manager`)
- CABPT README — https://github.com/siderolabs/cluster-api-bootstrap-provider-talos (compatibility matrix, recommended `clusterctl init` syntax, `TalosControlPlane` v1alpha3 example)
- Inspected released `bootstrap-components.yaml` and `control-plane-components.yaml` manifests for CRD names, API versions, and Deployment/Namespace names
- Cluster API clusterctl upgrade docs — https://cluster-api.sigs.k8s.io/clusterctl/commands/upgrade (confirmed `name:version` syntax for `--bootstrap` / `--control-plane`)
- CAPA clusterawsadm docs — https://cluster-api-aws.sigs.k8s.io/topics/using-clusterawsadm-to-fulfill-prerequisites (verified `clusterawsadm bootstrap credentials encode-as-profile`)
- CAPA AWSCluster CRD — confirmed `infrastructure.cluster.x-k8s.io/v1beta2` is a served version
- clusterctl v1.7.0 release asset — verified `clusterctl-linux-amd64` URL is reachable

## Issues Found
No technical issues found.

- Namespace and deployment names (`cabpt-system`/`cabpt-controller-manager`, `cacppt-system`/`cacppt-controller-manager`) match the released manifests.
- CRD names (`talosconfigs.bootstrap.cluster.x-k8s.io`, `talosconfigtemplates.bootstrap.cluster.x-k8s.io`, `taloscontrolplanes.controlplane.cluster.x-k8s.io`) are correct.
- `TalosControlPlane` API version `controlplane.cluster.x-k8s.io/v1alpha3` is the served version in CACPPT v0.5.x.
- `Cluster` API version `cluster.x-k8s.io/v1beta1` and `AWSCluster` API version `infrastructure.cluster.x-k8s.io/v1beta2` are correct for the CAPI/CAPA versions implied.
- `clusterctl init --bootstrap talos --control-plane talos --infrastructure <provider>` matches the official CABPT README guidance.
- `clusterctl upgrade apply --bootstrap talos:vX.Y.Z --control-plane talos:vX.Y.Z` uses the documented `name:version` format.
- The manual install URLs for `bootstrap-components.yaml` v0.6.5 and `control-plane-components.yaml` v0.5.6 resolve to valid release assets.

## Review Notes
- The pinned versions (CABPT v0.6.5 / CACPPT v0.5.6, both April 2024) are valid but no longer the latest. As of 2026-04-27, CABPT v0.6.12 and CACPPT v0.5.13 are the latest stable releases (with a v0.7.x line in alpha that targets CAPI v1beta2). The post's versions still work for users who want to follow it literally, so this is a future-improvement note, not an error.
- The "Testing the Provider Setup" YAML is intentionally minimal: it omits the referenced `AWSCluster` and `AWSMachineTemplate` resources, so applying it as-is would leave the Cluster waiting on missing infrastructure objects. The post frames it as a "simple test" snippet rather than a complete working manifest, which is reasonable, but readers should be aware they will need the infra-side resources for actual provisioning.
- `talosVersion: v1.7.0` works, though the official CABPT README examples use the short form (e.g. `v1.7`). Either is accepted.
- `clusterctl upgrade apply --contract v1beta1` is valid for current CAPI v1.x releases; once CAPI v1beta2 becomes the default contract, the post's upgrade example may need to switch to per-provider versions.
