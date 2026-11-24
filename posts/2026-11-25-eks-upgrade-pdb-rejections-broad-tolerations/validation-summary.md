# Validation summary

Reviewed on 25 November 2026.

## Evidence and scope

The guide distinguishes an original Pod blocked by eviction admission from a replacement returning to the retiring node. AWS managed-node documentation supports both failure paths. Kubernetes1.34.0 source verifies toleration matching and the NodeUnschedulable filter. The linked Todo discussion supplied incident context; its suggested destructive workarounds were not adopted. The AWS rePost URL was unavailable with403, so the official AWS user guide was used for the technical claims.

Six local matching cases passed using the Kubernetes0.34.0 core API implementation. Both exact inspection blocks ran against a disposable Kubernetes1.34.0 API with a cordoned Node and explicit Pod, Deployment and PDB fixtures. The narrow Deployment template fragment passed strict server dry-run, and the stored broad template was verified unchanged. This was not a scheduling or rollout test.

AWSCLI2.38.1 executed the describe-update example against an unsigned loopback fixture. The expected API path, node-group parameter and JMESPath result passed; no AWS request occurred. Three shell blocks passed bash syntax. The eight-node/seven-edge Mermaid diagram was checked structurally. The generated1280x720 social image was opened and visually reviewed; its three-line title fits without clipping.

## Limits

No EKS upgrade, live scheduler, kubelet, eviction, database, rollout or application recovery was run. Fixtures establish command and matching behavior, not whether a real replacement would choose a specific node. CloudWatch history, IAM authorization and managed-service timing were not tested. Mermaid was not rendered. The disposable Kubernetes API and loopback fixture server stopped; the temporary kubeconfig was removed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
