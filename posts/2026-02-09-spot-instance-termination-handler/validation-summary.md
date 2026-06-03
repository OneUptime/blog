# Validation Summary: How to Use Spot Instance Interruption Handling with Node Termination Handler

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS EC2 Spot Instances
- AWS Node Termination Handler
- Amazon EKS
- Kubernetes workloads, node selectors, tolerations, lifecycle hooks, and PodDisruptionBudgets
- Helm
- Karpenter
- Prometheus Operator
- PromQL
- Go
- Python and boto3

## Sources Consulted
- AWS Node Termination Handler upstream README and Helm chart configuration: https://github.com/aws/aws-node-termination-handler
- AWS Node Termination Handler Helm chart values and PodMonitor template: https://github.com/aws/aws-node-termination-handler/tree/main/config/helm/aws-node-termination-handler
- Amazon EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- Amazon EKS managed node group capacity type labels: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes pod termination and lifecycle hook documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Karpenter NodePool documentation: https://karpenter.sh/v1.7/concepts/nodepools/
- Prometheus Operator API reference for PodMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- boto3 EC2 describe_spot_price_history reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_spot_price_history.html
- boto3 Pricing get_products reference: https://docs.aws.amazon.com/boto3/latest/reference/services/pricing/client/get_products.html
- AWS EC2 Spot pricing and savings documentation: https://aws.amazon.com/ec2/spot/

## Issues Found
- The Helm install used the older EKS chart repository path. Updated it to the current upstream OCI chart install flow through public ECR, including an explicit chart version.
- Metrics were shown without enabling the NTH Prometheus server. Added `enablePrometheusServer=true` to the Helm command.
- The post used `node.kubernetes.io/instance-type=spot` as a Spot capacity label. That Kubernetes label represents the instance shape, such as `m5.xlarge`, not Spot/on-demand capacity. Replaced the examples with the EKS managed node group capacity label and noted the Karpenter capacity label.
- The Go graceful shutdown example referenced `log` without importing it and ignored `ListenAndServe` errors. Added the missing imports and basic `http.ErrServerClosed` handling.
- The monitoring example used `ServiceMonitor` and a `metrics` port while the article installs NTH in IMDS/DaemonSet mode. Updated it to `PodMonitor` with the chart's `http-metrics` port.
- The PromQL examples used a non-current metric name and label. Updated queries to use the current `actions_total` metric with `node_status="success"`.
- The mixed instance affinity example used `node.kubernetes.io/instance-type` for Spot/on-demand scheduling. Updated it to use `eks.amazonaws.com/capacityType` with `ON_DEMAND` and `SPOT` values.
- The Karpenter example used the deprecated `karpenter.sh/v1alpha5` `Provisioner` API and `ttlSecondsAfterEmpty`. Updated it to a current `karpenter.sh/v1` `NodePool` with `nodeClassRef`, requirements, and consolidation settings.
- The cost savings Python example called undefined helper functions and estimated equivalent on-demand cost by assuming a fixed discount. Added boto3-based helpers for current Spot and on-demand prices and removed the fixed-discount calculation.

## Review Notes
- EKS managed node groups already provide Spot interruption handling for their nodes; Node Termination Handler is still relevant for self-managed nodes and other AWS Kubernetes setups.
- The pricing script is scoped to Linux shared-tenancy instances in `us-east-1`; other regions or operating systems require adjusting the Pricing API filters.
- Local validation parsed all YAML snippets and the Python code block. The local workspace does not have `go` or `kubectl` installed, so Go compilation and kubectl flag checks were reviewed against documentation rather than executed locally.
