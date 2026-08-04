# Validation Summary: Choose Requests or Usage for Kubernetes Showback

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes resource requests, limits, scheduling, init containers, sidecar containers, and Pod-level resources
- Kubernetes Metrics API and `kubectl top`
- Prometheus CPU counters and memory gauges
- OpenCost allocation specification and Allocation API
- AWS split cost allocation data for Amazon EKS
- Amazon Managed Service for Prometheus
- Amazon CloudWatch Container Insights
- AWS Cost and Usage Report 2.0 (CUR 2.0)

## Sources Consulted

- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Tools for Monitoring Resources](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [Kubernetes: `kubectl top`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/)
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus: Instrumentation practices](https://prometheus.io/docs/practices/instrumentation/)
- [OpenCost: Cost allocation specification](https://opencost.io/docs/specification/)
- [OpenCost: Allocation API and resolution behavior](https://opencost.io/docs/integrations/api/)
- [AWS Data Exports: Enabling EKS split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/enabling-split-cost-allocation-data.html)
- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS Data Exports: Example of split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/example-split-cost-allocation-data.html)
- [AWS Data Exports: Using split cost allocation data with Amazon Managed Service for Prometheus](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data-resource-amp.html)
- [AWS Data Exports: Using split cost allocation data with Amazon CloudWatch Container Insights](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data-cloudwatch.html)
- [AWS Data Exports: CUR 2.0 split line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html)
- [Amazon EKS: View costs by Pod with split cost allocation](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)

## Issues Found

- The post stated without qualification that a high limit does not reserve capacity. Kubernetes copies a resource limit into the corresponding request when the request is omitted and no admission-time default request exists. The explanation now distinguishes a high limit paired with a lower explicit request from this implicit-request behavior, and refers to workloads with no effective requests.
- The post attributed max-of-request-and-usage totals above node capacity only to inconsistent telemetry or alignment. Applying the maximum separately to each workload can produce oversubscription even with consistent data; AWS's official example shows 4.9 allocated vCPUs on a 4-vCPU instance. The text now explains this and requires documented normalization or reconciliation of cost shares.
- The validation checklist conflated asset cost with total cluster cost. It now states the OpenCost identities correctly: workload cost plus idle equals asset cost, and platform overhead is added to reach total cluster cost.

## Review Notes

- The formulas are dimensionally correct provided the CPU and memory rates are expressed per resource-hour, as the later worked formula makes explicit.
- The AWS preference modes, request-only participation rule, CUR 2.0 split column names and meanings, 9:1 CPU-to-memory relative weighting example, and accelerated-computing exception match current AWS documentation.
- OpenCost's API documents an accuracy/performance tradeoff for query resolution and warns that coarse resolution can materially misstate short-lived workloads, consistent with the post's telemetry guidance.
- Kubernetes Pod-level resources are version-sensitive. They are beta and enabled by default from Kubernetes 1.34; the post appropriately tells readers to use the semantics supported by their cluster version without claiming universal availability.
