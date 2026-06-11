# Validation Summary: How to Create Kubernetes Karpenter Node Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Karpenter
- AWS EKS
- EC2NodeClass and NodePool custom resources
- Helm
- kubectl
- Prometheus ServiceMonitor

## Sources Consulted
- Karpenter Getting Started with Karpenter: https://karpenter.sh/docs/getting-started/getting-started-with-karpenter/
- Karpenter v1.0 NodeClasses: https://karpenter.sh/v1.0/concepts/nodeclasses/
- Karpenter NodePools: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter v1.0 Scheduling: https://karpenter.sh/v1.0/concepts/scheduling/
- Karpenter Disruption: https://karpenter.sh/docs/concepts/disruption/
- Karpenter v1.0 Metrics: https://karpenter.sh/v1.0/reference/metrics/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The first Mermaid diagram incorrectly showed the Kubernetes scheduler watching Karpenter. Changed it to show Karpenter watching unschedulable pods, matching Karpenter's documented behavior.
- The EC2NodeClass apply command used `kubectl apply -f ec2nodeclass.yaml` even though the manifest contains `${CLUSTER_NAME}` placeholders. Changed the command to `envsubst < ec2nodeclass.yaml | kubectl apply -f -` so the role and discovery tags are rendered before applying.
- The topology diagram said Karpenter "balances" Availability Zones. Karpenter documentation says NodePools do not balance or rebalance zones by themselves; they respect pod topology spread constraints. Updated the diagram labels accordingly.
- The disruption budget example described `nodes: "1"` as "at least 1 node." Karpenter uses the most restrictive matching budget, so this is a cap, not a floor. Updated the comment.
- The command for listing provisioned nodes used a non-documented `karpenter.sh/registered=true` label. Replaced it with `karpenter.sh/nodepool`, a documented Karpenter node label.
- The metrics list included invalid or outdated metric names. Replaced `karpenter_nodes_total` with `karpenter_cluster_state_node_count` and `karpenter_nodes_created_total`, and replaced `karpenter_interruption_received_total` with `karpenter_interruption_received_messages_total`.

## Review Notes
- The examples target Karpenter v1.0 APIs (`karpenter.sh/v1` and `karpenter.k8s.aws/v1`) and are consistent with the Karpenter v1.0 documentation reviewed.
- The `al2023@latest` AMI alias is supported, but Karpenter documentation recommends pinning AMI versions for production environments to avoid unplanned node drift during new AMI releases.
