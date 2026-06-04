# Validation Summary: Set Up Linkerd Multi-Cluster Gateway for Cross-Cluster Service Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Linkerd Multicluster
- Linkerd Viz
- Linkerd SMI / TrafficSplit
- Linkerd Failover extension
- Kubernetes Deployments and Services
- Kubernetes service mirroring
- Prometheus metrics

## Sources Consulted
- Linkerd 2.19 Multi-cluster communication: https://linkerd.io/2.19/tasks/multicluster/
- Linkerd 2.19 Multicluster CLI reference: https://linkerd.io/2.19/reference/cli/multicluster/
- Linkerd 2.18 Multi-cluster reference: https://linkerd.io/2.18/reference/multicluster/
- Linkerd 2.19 Automatic Multicluster Failover: https://linkerd.io/2.19/tasks/automatic-failover/
- Linkerd Traffic Split feature reference: https://linkerd.io/2/features/traffic-split/
- Linkerd Proxy Metrics reference: https://linkerd.io/2/reference/proxy-metrics/

## Issues Found
- The original install commands did not mention the shared trust anchor required for cross-cluster mTLS. Updated the prerequisites to install Linkerd with common trust-anchor and issuer credentials.
- The post used `linkerd multicluster link`, but current Linkerd documentation uses `linkerd multicluster link-gen`. Updated the linking commands.
- The linking flow did not configure source-cluster service mirror controllers as required by current Linkerd multicluster installs. Added the controller configuration commands before applying each link.
- Exported services used `mirror.linkerd.io/exported` as an annotation. Linkerd selects exported services by label, so the Service YAML and export command now use labels.
- The cross-cluster route description incorrectly said traffic goes through the source cluster gateway. Updated it to describe gateway-mode routing through the target cluster gateway.
- The NodePort example manually replaced the generated gateway Service and used a non-existent `--gateway-address` flag. Replaced it with `--gateway-service-type=NodePort`, `--gateway-addresses`, and `--gateway-port`.
- The failover section implied a plain TrafficSplit automatically fails over traffic. Updated it to require the Linkerd SMI and failover extensions, added the failover label and primary-service annotation, and noted the failover extension deprecation.
- The TrafficSplit API version was updated to the version used by Linkerd's failover documentation.
- The Prometheus examples used a non-standard `dst_cluster` label. Updated them to filter and group by mirrored destination service names.
- The gateway HA section manually replaced the gateway Deployment. Replaced it with the supported `linkerd multicluster install --ha` flag.
- The mTLS verification commands referenced binaries that are not valid user-facing verification steps. Replaced them with the documented `linkerd viz tap` approach for confirming `tls=true`.
- The unlink command used the wrong Link resource name. Updated it to delete the Link by cluster name.

## Review Notes
The failover extension is deprecated in current Linkerd releases; federated services are the recommended future path when clusters support flat pod-to-pod networking.
