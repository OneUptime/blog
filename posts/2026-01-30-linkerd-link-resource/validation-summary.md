# Validation Summary: How to Create Linkerd Link Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd multi-cluster
- Linkerd Link custom resources
- Kubernetes services, secrets, RBAC, and label selectors
- Linkerd CLI
- Linkerd SMI TrafficSplit

## Sources Consulted
- Linkerd official multi-cluster installation guide: https://linkerd.io/2-edge/tasks/installing-multicluster/
- Linkerd official multi-cluster reference: https://linkerd.io/2-edge/reference/multicluster/
- Linkerd official multi-cluster feature overview: https://linkerd.io/2-edge/features/multicluster/
- Linkerd official CLI reference for `multicluster`: https://linkerd.io/2-edge/reference/cli/multicluster/
- Linkerd Link CRD schema in the official Linkerd repository: https://github.com/linkerd/linkerd2/blob/main/multicluster/charts/linkerd-multicluster/templates/link-crd.yaml
- Linkerd multi-cluster chart values in the official Linkerd repository: https://github.com/linkerd/linkerd2/blob/main/multicluster/charts/linkerd-multicluster/values.yaml
- Linkerd multi-cluster remote-access RBAC template in the official Linkerd repository: https://github.com/linkerd/linkerd2/blob/main/multicluster/charts/linkerd-multicluster/templates/remote-access-service-mirror-rbac.yaml
- Linkerd multi-cluster controller deployment template in the official Linkerd repository: https://github.com/linkerd/linkerd2/blob/main/multicluster/charts/linkerd-multicluster/templates/controller/deployment.yaml
- Linkerd CLI `link` command source showing deprecation in favor of `link-gen`: https://github.com/linkerd/linkerd2/blob/main/multicluster/cmd/link.go

## Issues Found
- The Link examples used `multicluster.linkerd.io/v1alpha1`. Updated them to `multicluster.linkerd.io/v1alpha3`, which is the current stored Link CRD version in Linkerd.
- The Link examples omitted `clusterCredentialsSecret`. Added it to the custom Link resources because the Link needs to reference the kubeconfig secret for the target cluster.
- `gatewayPort` and `probeSpec.port` were written as numbers. Quoted them as strings to match the Link CRD schema.
- The post described `remoteDiscoverySelector` as namespace filtering and used a namespace label. Corrected it to service selection for remote discovery mode with `mirror.linkerd.io/exported=remote-discovery`.
- The post used the older `linkerd multicluster link` workflow. Updated generated-link examples to `linkerd multicluster link-gen` and adjusted wording accordingly.
- The three-cluster setup installed the multi-cluster extension without configuring the source cluster controllers needed by the declarative `link-gen` workflow. Added controller values for `cluster-a` to watch the `cluster-b` and `cluster-c` links.
- The shared trust anchor install example created only a root certificate and passed only `--identity-trust-anchors-file`. Added issuer certificate generation and issuer flags so each cluster uses issuer material signed by the shared root.
- The gateway identity section called the identity string SPIFFE format. Corrected it to Linkerd's service account identity format.
- The RBAC example used a target-specific service account and omitted several resources used by current Linkerd service mirroring. Updated the sample to the default remote-access service account and representative current read permissions.
- Troubleshooting commands referenced `deploy/linkerd-service-mirror`, but current declarative controllers are named `controller-<link-name>`. Updated examples to `deploy/controller-production-cluster`.
- The gateway health test used `https://...:4143/ready`. Corrected it to the gateway probe endpoint on port `4191`.
- The `TrafficSplit` example did not mention that it requires the Linkerd SMI extension. Added that caveat.

## Review Notes
The Linkerd multi-cluster workflow is version-sensitive. The current official documentation describes the declarative `link-gen` workflow as available starting with Linkerd edge-25.4.4, while older stable documentation and examples may still show `linkerd multicluster link`.
