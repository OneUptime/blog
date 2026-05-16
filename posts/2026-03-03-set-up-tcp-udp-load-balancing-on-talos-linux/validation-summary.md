# Validation Summary: How to Set Up TCP/UDP Load Balancing on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services
- TCP and UDP load balancing
- MetalLB
- kube-vip
- ingress-nginx
- Helm
- HAProxy
- Prometheus Operator rules

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service protocols documentation: https://kubernetes.io/docs/reference/networking/service-protocols/
- Kubernetes external LoadBalancer documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB installation documentation: https://metallb.io/installation/
- ingress-nginx TCP/UDP services documentation: https://kubernetes.github.io/ingress-nginx/user-guide/exposing-tcp-udp-services/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- kube-vip Kubernetes Services documentation: https://kube-vip.io/docs/usage/kubernetes-services/
- HAProxy health checks documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Issues Found
- The mixed TCP/UDP LoadBalancer section said Kubernetes requires separate Services for different protocols. Current Kubernetes releases support mixed-protocol LoadBalancer Services through the stable `MixedProtocolLBService` feature, although provider implementations can still restrict protocol combinations. Updated the explanation to reflect that nuance while retaining the MetalLB shared-IP workaround.
- The MetalLB examples used the older `metallb.universe.tf/allow-shared-ip` annotation and `spec.loadBalancerIP`. Updated the examples to use `metallb.io/allow-shared-ip` and `metallb.io/loadBalancerIPs`, matching current MetalLB documentation and avoiding the deprecated Kubernetes `spec.loadBalancerIP` field.
- The VoIP example named TCP port 5061 `srtp` and described UDP port 10000 as a range. Renamed those ports to `sip-tls` and `rtp-10000` so the example does not imply SRTP over TCP or Kubernetes Service port ranges.
- The ingress-nginx Helm install command assumed the chart repository was already configured. Added the official `helm repo add` and `helm repo update` commands before `helm install`.
- The HAProxy PostgreSQL example used an incomplete custom startup packet for `tcp-check`. Replaced it with HAProxy's documented `option pgsql-check`.
- The HAProxy Redis example used a manual TCP check where HAProxy has a documented Redis check directive. Replaced it with `option redis-check`.

## Review Notes
The remaining examples are generally valid Kubernetes manifests or illustrative snippets. The post does not include full MetalLB installation or IPAddressPool/L2Advertisement setup, so readers still need a configured MetalLB or kube-vip environment before the LoadBalancer examples will receive external IPs.
