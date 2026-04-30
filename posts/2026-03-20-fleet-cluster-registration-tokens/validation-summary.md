# Validation Summary: How to Configure Fleet Cluster Registration Tokens

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Helm
- kubectl
- YAML

## Sources Consulted
- Fleet docs: Register Downstream Clusters: https://fleet.rancher.io/0.14/how-tos-for-operators/cluster-registration
- Fleet docs: Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet source: `ClusterRegistrationToken` API type: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/clusterregistrationtoken_types.go
- Fleet source: `Cluster` status API type: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/cluster_types.go
- Fleet source: `ClusterRegistrationToken` controller: https://raw.githubusercontent.com/rancher/fleet/main/internal/cmd/controller/agentmanagement/controllers/clusterregistrationtoken/handler.go
- Fleet source: `fleet-agent` chart values: https://raw.githubusercontent.com/rancher/fleet/main/charts/fleet-agent/values.yaml
- Fleet source: `fleet-agent` chart README: https://raw.githubusercontent.com/rancher/fleet/main/charts/fleet-agent/README.md

## Issues Found
- The introduction treated `ClusterRegistrationToken` as the general Fleet/Rancher cluster registration mechanism. I corrected it to describe the agent-initiated registration flow specifically and added the Rancher UI caveat, because Rancher dashboard imports use manager-initiated registration instead.
- The post claimed that a token generates a registration manifest or URL and used `status.manifestNamespace`, which is not a current `ClusterRegistrationToken` status field. I replaced that flow with the supported generated Secret plus `values.yaml` workflow, using `status.secretName` and the Secret's `data.values` field.
- The Helm install example passed a Secret name as `token`, set an unsupported `clusterName` chart value, and manually set values that Fleet already writes into the generated `values.yaml`. I replaced it with the supported `helm install ... --values values.yaml` flow.
- The Rancher `/v3/import/...` command was presented as if it came from a Fleet `ClusterRegistrationToken`. I corrected that section to clarify it is Rancher's separate manager-initiated import flow.
- The token lifecycle and verification commands used inaccurate fields. I updated the expiration example to show both `spec.ttl` and `status.expires`, and I changed the verification example to use `status.agent.lastSeen` across registered clusters instead of assuming a fixed cluster name.

## Review Notes
- The post is now accurate for agent-initiated Fleet registration. In Rancher-integrated environments, the more common dashboard import flow is manager-initiated and does not require manually creating `ClusterRegistrationToken` resources.
- The examples assume the Fleet workspace namespace is `fleet-default`. Environments that use different workspaces should substitute the appropriate namespace.
