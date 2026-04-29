# Validation Summary: How to Disable Traefik in K3s

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Traefik
- ingress-nginx
- MetalLB
- Helm

## Sources Consulted
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Helm / HelmChartConfig: https://docs.k3s.io/add-ons/helm
- ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx Bare-metal considerations: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- ingress-nginx Welcome / Retirement notice: https://kubernetes.github.io/ingress-nginx/
- Traefik Kubernetes IngressRoute reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- MetalLB Usage: https://metallb.io/usage/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The introduction said K3s ships with Traefik v2 by default. Updated it to reflect current K3s behavior: K3s 1.32+ includes Traefik v3, while K3s 1.21-1.31 included Traefik v2.
- The introduction described ingress-nginx in a way that omitted its current lifecycle state. Added a brief note that ingress-nginx entered retirement in March 2026.
- The post implied the disable setting could be added on one node only. Updated the wording to clarify that the Traefik disable configuration must be applied on each K3s server node.
- The existing-cluster method used `tee -a` to append a second `disable:` key into `/etc/rancher/k3s/config.yaml`, which is unsafe YAML editing and can conflict with existing config. Replaced it with a supported config drop-in file under `/etc/rancher/k3s/config.yaml.d/`.
- The monitoring command for Traefik removal piped `kubectl get pods -w` through `grep`, which is brittle for an interactive watch. Replaced it with `kubectl get pods -n kube-system -w`.
- The verification command used `kubectl get helmchart -n kube-system`. Replaced it with the explicit resource name `kubectl get helmcharts.helm.cattle.io -n kube-system` for clarity and correctness.
- The ingress-nginx install command pinned chart version `4.9.1`, which is outdated. Removed the hard-coded version so the command aligns with the current official install flow.
- The ServiceLB explanation implied a LoadBalancer IP is always assigned. Tightened the wording to note that ports 80 and 443 must be available on eligible nodes.
- The NodePort example incorrectly set `controller.service.nodePorts.http=80` and `https=443`, which are outside Kubernetes' default NodePort range. Updated them to valid NodePort values `30080` and `30443`, and removed the unrelated `controller.hostPort.enabled=true` setting.
- The MetalLB example used the deprecated `metallb.universe.tf/address-pool` annotation. Updated it to `metallb.io/address-pool`.
- The Traefik `IngressRoute` example used the older `traefik.containo.us/v1alpha1` API group. Updated it to the current `traefik.io/v1alpha1` API group.
- The section titled "Customizing NGINX Ingress with HelmChartConfig" did not actually use K3s `HelmChartConfig`; it used normal Helm commands. Renamed the section to "Customizing NGINX Ingress with Helm".
- The Helm customization example enabled `controller.metrics.serviceMonitor.enabled=true` without noting the requirement for Prometheus Operator CRDs. Removed that flag so the example remains generally valid.
- The Helm customization example did not preserve existing values during upgrade. Updated it to use `helm upgrade --reuse-values`.
- The testing section assumed a LoadBalancer IP-based setup only. Added a NodePort testing alternative using a node IP and `Host` header.

## Review Notes
- The post is now technically correct for current K3s behavior as of April 29, 2026.
- ingress-nginx remains installable, but the project is retired after March 2026 and no longer receives new releases or fixes; readers should evaluate whether another ingress controller is a better long-term choice.
- MetalLB and K3s ServiceLB should not be used as competing LoadBalancer implementations on the same cluster; K3s documents disabling ServiceLB when switching to MetalLB.
