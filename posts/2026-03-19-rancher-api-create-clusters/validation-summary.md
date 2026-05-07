# Validation Summary: How to Create Clusters Using the Rancher API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher provisioning API (`provisioning.cattle.io`)
- Rancher v3 API (`clusterregistrationtokens`, `cloudCredentials`)
- Kubernetes
- RKE2
- K3s
- Shell scripting with `curl`, `jq`, and `kubectl`

## Sources Consulted
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Previous v3 Rancher API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Registering Existing Clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- K3s Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- EC2 Machine Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration/amazon-ec2
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- Rancher source, provisioning cluster schema: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/provisioning.cattle.io/v1/cluster_types.go
- Rancher source, management cluster schema: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/management.cattle.io/v3/cluster_types.go
- Rancher source, registration token status generation: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/controllers/dashboard/clusterregistrationtoken/status.go
- Rancher source, provisioning-to-management cluster controller: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/controllers/provisioningv2/cluster/controller.go
- Rancher source, imported cluster handling: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/controllers/provisioningv2/cluster/import.go
- Rancher source, EC2 credential dynamic schema handling: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/controllers/management/drivers/nodedriver/machine_driver.go
- JSON Merge Patch (RFC 7396): https://datatracker.ietf.org/doc/html/rfc7396

## Issues Found
- The custom-cluster registration-token example used the provisioning cluster name as `clusterId`, but Rancher’s `clusterregistrationtokens` endpoint expects the management cluster ID. I changed the example to poll `.status.clusterName` from the provisioning cluster and use that ID.
- The custom-cluster jq example mapped `insecureNodeCommand` from `.insecureCommand`, which is the import command, not the node-registration command. I changed it to `.insecureNodeCommand`.
- The node-registration examples manually reconstructed the system-agent install command, which omitted generated details such as CA checksum handling and agent environment variables. I changed the post to reuse Rancher’s generated `nodeCommand`.
- The K3s example set `machineGlobalConfig.cni` to `flannel`. K3s uses Flannel by default and does not use the RKE2-style `cni` setting in this example, so I removed that block.
- The imported-cluster example queried `clusterregistrationtokens` with `clusterId=imported-cluster`, used a fixed `sleep 5`, and hardcoded an incomplete `/v3/import/...yaml` URL. I changed it to poll for the management cluster ID and the generated `manifestUrl`, then reuse that URL in the `kubectl apply` command.
- The cloud machine-pool section referred to legacy “node templates,” but the provisioning v2 examples use machine configuration objects referenced by `machineConfigRef`. I corrected the terminology and clarified that the referenced machine config objects must already exist in the cluster namespace.
- The cluster-status polling example assumed `.status.conditions` always existed. I changed the jq expression to tolerate a missing `Ready` condition during early provisioning.
- The metadata update example used `PUT` with a partial object body. I replaced it with `PATCH` and `application/merge-patch+json`, which is the correct partial-update pattern.
- The prerequisites omitted `kubectl`, even though the import flow requires it. I added it.
- The post hardcoded Kubernetes version strings without warning that support depends on the Rancher release. I added a short note telling readers to use a version supported by their Rancher release.

## Review Notes
- Rancher v2.14 and later are phasing out legacy v3 API tokens. The request examples remain valid for Rancher API token authentication, but the exact token creation flow depends on the Rancher release in use.
- The cloud machine-pool example is still intentionally partial: driver-specific machine config objects such as `Amazonec2Config` vary by provider and must be created separately before the cluster payload can reference them.
- The version strings in the examples are illustrative only. Readers should verify supported Kubernetes versions against their Rancher release before running the commands.
