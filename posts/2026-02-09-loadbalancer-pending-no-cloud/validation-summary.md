# Validation Summary: How to Fix Kubernetes LoadBalancer Service Stuck

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer and NodePort networking
- Kubernetes Ingress
- MetalLB
- kube-vip and kube-vip-cloud-provider
- ingress-nginx Helm chart
- Prometheus alerting with kube-state-metrics

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- kube-vip DaemonSet documentation: https://kube-vip.io/docs/installation/daemonset/
- kube-vip Services documentation: https://kube-vip.io/docs/usage/services/
- kube-vip cloud provider documentation: https://kube-vip.io/docs/usage/cloud-provider/
- kube-state-metrics Service metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/service-metrics.md

## Issues Found
- The MetalLB manifest install command used `v0.13.12`, which is stale compared with the current MetalLB installation documentation. Updated it to `v0.16.1`.
- The NodePort section said NodePort does not provide load balancing. Kubernetes does forward NodePort traffic to ready service endpoints, but NodePort does not provide an external load balancer or a single stable entry point. Updated the wording to reflect that distinction.
- The kube-vip section configured an address range but did not install the kube-vip cloud provider, which is the component documented for assigning LoadBalancer IPs from the `kubevip` ConfigMap. Added the kube-vip cloud provider manifest apply command.
- The kube-vip troubleshooting commands only checked the kube-vip DaemonSet. Added commands to check the kube-vip cloud-provider pod and logs because pending services can also be caused by IP allocation failures in that component.
- The Prometheus alert expression compared `kube_service_status_load_balancer_ingress` to zero. kube-state-metrics emits one series per load balancer ingress address, so pending services usually have no ingress series rather than a zero-valued one. Replaced the expression with an `unless on (namespace, service)` query against `kube_service_spec_type{type="LoadBalancer"}`.

## Review Notes
The remaining Kubernetes Service, Ingress, MetalLB `IPAddressPool`/`L2Advertisement`, NodePort, and jq examples are syntactically valid and match current APIs. The kube-vip DaemonSet manifest is simplified; in production, users should generate a manifest from the kube-vip CLI or follow the exact mode-specific kube-vip documentation for their cluster and network.
