# Validation Summary: How to Reduce Istio Infrastructure Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- IstioOperator configuration
- Istio Gateway API
- Istio ambient mode, ztunnel, and waypoint proxies
- Prometheus and kube-state-metrics
- Kubernetes Horizontal Pod Autoscaler
- AWS EC2 and Elastic Load Balancing pricing

## Sources Consulted
- Istio IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Customizing the installation configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio Envoy Access Logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Discovery Selectors: https://istio.io/latest/blog/2021/discovery-selectors/
- Istio Ambient Overview: https://istio.io/latest/docs/ambient/overview/
- Istio Configure waypoint proxies: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio Egress Gateways: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- AWS EC2 M5 instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- AWS Elastic Load Balancing documentation and pricing: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html and https://aws.amazon.com/elasticloadbalancing/pricing/

## Issues Found
- The AWS m5.xlarge cost example said each reserved CPU core costs roughly $140/month. At $0.192/hour, an m5.xlarge instance costs about $140/month and has 4 vCPUs, so the per-vCPU cost is about $35/month. Updated the sentence accordingly.
- The node sizing example said a sidecar request increase from 500m/512Mi to 600m/640Mi is a 20% resource increase. CPU increases by 20%, but memory increases by 25%. Updated the sentence to state both percentages separately.

## Review Notes
- The IstioOperator snippets use APIs still supported by `istioctl install -f`, though Helm and the Telemetry API are also commonly recommended for production customization.
- `meshConfig.accessLogFile` and `meshConfig.defaultConfig.tracing.sampling` remain valid, while Istio documentation recommends the Telemetry API for fine-grained access logging and tracing configuration.
- The PromQL examples assume kube-state-metrics is installed and exposing `kube_pod_container_resource_requests`.
