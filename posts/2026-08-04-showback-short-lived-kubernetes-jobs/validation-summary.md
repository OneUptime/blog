# Validation Summary: Showback for Kubernetes Jobs After Their Pods Disappear

## Status

validated

## Post Type

Technical guide covering architecture, cost allocation, and operational controls for short-lived Kubernetes batch workloads.

## Technologies Covered

- Kubernetes Jobs, CronJobs, Pod lifecycle, UIDs, TTL cleanup, and Pod garbage collection
- Kubernetes audit events, API watches, controllers, and resource metrics
- kube-state-metrics
- Metrics Server
- Prometheus counters, gauges, scraping, retention, and Pushgateway
- OpenCost Allocation API
- AWS Cost and Usage Reports (CUR) and EKS split cost allocation data
- Kubernetes showback, FinOps allocation, and node-cost reconciliation

## Sources Consulted

- [Kubernetes Jobs documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes Job API reference](https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/)
- [Kubernetes Pod lifecycle documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes object names and UIDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [kube-state-metrics project documentation](https://github.com/kubernetes/kube-state-metrics)
- [Prometheus `increase()` function documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase)
- [Prometheus storage documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus guidance for the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [OpenCost Allocation API documentation](https://opencost.io/docs/integrations/api/)
- [AWS split cost allocation data overview](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS split cost allocation data configuration](https://docs.aws.amazon.com/cur/latest/userguide/enabling-split-cost-allocation-data.html)
- [AWS split line item reference](https://docs.aws.amazon.com/cur/latest/userguide/split-line-item-columns.html)
- [AWS EKS cost monitoring with split cost allocation data](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)
- [AWS Kubernetes labels for EKS cost allocation](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data-kubernetes-labels.html)

## Issues Found

No technical issues found.

## Review Notes

The post's formulas are intentionally policy-level resource-allocation formulas rather than executable code. The stated OpenCost default is current as of validation but is implementation documentation that should be rechecked if the post is updated later. AWS currently offers request-based and telemetry-backed EKS split-cost preferences; accelerated computing instances add an accelerator usage record alongside the CPU and memory records and use resource requests for allocation. This does not conflict with the post's CPU-and-memory statement.
