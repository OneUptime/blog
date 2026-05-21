# Validation Summary: How to Set Up Round Robin Load Balancing in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy load balancing
- Kubernetes Deployments and Services
- DestinationRule
- VirtualService
- kubectl
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio 1.14 change notes: https://istio.io/latest/news/releases/1.14.x/announcing-1.14/change-notes/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy supported load balancers documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers
- Envoy round robin load balancing FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/load_balancing/concurrency_lb.html
- Envoy Cluster LbPolicy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Hello Minikube tutorial for the agnhost test image: https://kubernetes.io/docs/tutorials/hello-minikube/
- Kubernetes agnhost netexec package documentation: https://pkg.go.dev/k8s.io/kubernetes/test/images/agnhost/netexec

## Issues Found
- The post incorrectly stated that round robin is the default load balancing algorithm in current Istio. Current Istio documentation says the default is least request, and Istio 1.14 changed the default from `ROUND_ROBIN` to `LEAST_REQUEST`. I updated the introduction, DestinationRule explanation, and conclusion to describe round robin as an explicitly configured policy rather than the default.
- The test Deployment used `hashicorp/http-echo` with static `hello` output while claiming the service identifies which pod handled each request. That output could not validate distribution. I changed the example to use Kubernetes' `agnhost` `netexec` test image and the `/hostname` endpoint, which returns the serving pod hostname.
- The interactive curl pod command passed `sh` as an argument to the container image instead of explicitly overriding the command. I added `--restart=Never --command -- sh` to match the current `kubectl run` command shape.
- The explanation implied a single per-proxy round-robin counter. Envoy documentation notes worker threads and their load balancers do not coordinate, so I added that caveat while preserving the per-client explanation.
- The comparison table described `PASSTHROUGH` as best for an external DNS-based service. Istio documents `PASSTHROUGH` as forwarding to the original IP without proxy load balancing, so I corrected the scenario wording.

## Review Notes
- All YAML and JSON snippets in the post were parsed locally after the edits.
- `kubectl` and `istioctl` were not installed in this environment, so CLI validation was performed against official command documentation instead of local `--help` output.
