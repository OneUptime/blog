# Validation Summary: How to Calculate Total Cost of Istio Deployment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Envoy sidecars and gateways
- Kubernetes
- kube-state-metrics
- Prometheus and PromQL
- AWS EC2, S3, EBS, Elastic Load Balancing, and cross-AZ data transfer
- Distributed tracing and access logging

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio observability documentation: https://istio.io/latest/docs/concepts/observability/
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- AWS EC2 On-Demand pricing: https://aws.amazon.com/ec2/pricing/on-demand/
- AWS Elastic Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- AWS EBS pricing: https://aws.amazon.com/ebs/pricing/
- AWS guidance on cross-AZ Network Load Balancer transfer costs: https://aws.amazon.com/blogs/networking-and-content-delivery/optimizing-data-transfer-costs-when-using-aws-network-load-balancer/

## Issues Found
- The gateway compute PromQL filtered `kube_pod_container_resource_requests` with `app=~"istio-.*gateway"`, but kube-state-metrics documents that this metric carries labels such as `namespace`, `pod`, `container`, `resource`, and `unit`, not arbitrary Kubernetes app labels. Updated the queries to filter gateway pods by `pod=~"istio-.*gateway-.*"` and `container="istio-proxy"`.
- The metrics storage section stated that Prometheus uses about 3-4 bytes per sample. Prometheus documentation currently gives an average of 1-2 bytes per sample on disk. Updated the storage estimate and recalculated daily/monthly volume.
- The metrics cost example used `$0.10/GB for S3` and `$0.023/GB for compressed Prometheus storage`, which mixed up current storage price assumptions. Updated the text to use S3 Standard at about $0.023/GB-month and block storage at about $0.08-0.10/GB-month.
- The network section described mTLS as adding a fixed 2-5% payload-size overhead due to encryption. Reworded this to explain that mTLS adds handshake and TLS record overhead, and that the exact percentage depends on connection reuse, request size, and protocol behavior.

## Review Notes
The cost figures are illustrative and region/provider-specific. AWS prices and managed observability pricing can change, so readers should plug in their own current rates before using the model for budgeting.
