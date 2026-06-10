# Validation Summary: How to Create Spot Instance Strategy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Spot Instances
- AWS EC2 Fleet API
- EC2 Instance Metadata Service (IMDSv2)
- AWS Node Termination Handler
- Kubernetes (Deployments, DaemonSets, Node taints/tolerations, PodDisruptionBudget, topologySpreadConstraints)
- Karpenter v1 (NodePool, EC2NodeClass)
- Node.js / Express (graceful shutdown)
- Bash scripting (metadata polling)
- Prometheus (recording rules, alerts)
- GCP Spot VMs, Azure Spot VMs (comparative table)

## Sources Consulted
- AWS EC2 Spot termination notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- IMDSv2 configuration: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- EC2 Fleet allocation strategies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html
- Karpenter NodePools (v1): https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClasses (v1): https://karpenter.sh/docs/concepts/nodeclasses/
- AWS Node Termination Handler: https://github.com/aws/aws-node-termination-handler (values.yaml, releases)
- GCP Spot VMs pricing: https://cloud.google.com/compute/docs/instances/spot
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found

1. **IMDSv2 inconsistency in the bash polling script.** The EC2NodeClass example later in the post sets `httpTokens: required` (enforcing IMDSv2), but the `spot-interruption-handler.sh` script queried the metadata endpoint with plain `curl` and no token. On any instance with IMDSv2 enforced, that request returns 401. Fixed by adding an IMDSv2 token fetch (`PUT /latest/api/token`) and passing the `X-aws-ec2-metadata-token` header on the subsequent GET.

2. **Misleading comment on the Karpenter NodePool disruption budget.** The comment read "Replace nodes after 24 hours to pick up new AMIs," but the configuration below it (`budgets: - nodes: "10%"`) is a disruption rate cap, not a TTL — node expiry in Karpenter v1 lives at `spec.template.spec.expireAfter`, not in `budgets`. Updated the comment to accurately describe what the budget controls (concurrent disruption cap).

3. **GCP Spot VM discount range.** The comparison table claimed "60-91%" for GCP. Google's official Spot VMs documentation states only "up to 91% discounts" with no published lower bound. Updated the cell to "Up to 91%" to match the source.

## Review Notes
- The bash script still uses the legacy `/latest/meta-data/spot/termination-time` endpoint. It remains functional (AWS continues to support it for backward compatibility), but AWS now recommends `/latest/meta-data/spot/instance-action`, which returns JSON. Left as-is since the surrounding explanation ("returns 404 if no termination scheduled, or ISO timestamp if terminating") matches the legacy endpoint's contract.
- EC2 Fleet `AllocationStrategy: capacityOptimized` is still valid, but AWS has recommended `priceCapacityOptimized` as the default since late 2022. The current value is not wrong, only no longer the recommended default.
- The AWS Node Termination Handler image tag `v1.22.0` is older than the current release (v1.25.x as of mid-2026). The tag still exists and the env-var schema shown is unchanged, so the example is functional, but readers may want to pin to a newer release.
- `DELETE_LOCAL_DATA` was verified as still the current env var name in NTH (it has not been renamed to `DELETE_EMPTYDIR_DATA`, despite the analogous `kubectl drain` CLI flag rename).
- The Karpenter EC2NodeClass uses `amiSelectorTerms: - alias: al2023@latest`. This is syntactically valid, but Karpenter docs recommend pinning to a specific release tag (e.g. `al2023@v20240703`) in production rather than `latest`, to avoid unintentional AMI rollouts on node replacement. Worth a note in a future revision.
- The `node.kubernetes.io/lifecycle: spot` label is a community convention (used by Cluster Autoscaler ecosystem), not an EKS-managed-node-group default. EKS managed node groups set `eks.amazonaws.com/capacityType: SPOT`. The post's convention is fine, but readers using EKS managed node groups will need to adjust selectors.
