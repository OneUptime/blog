# Validation Summary: How to Set Up Traefik Ingress on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Traefik Proxy
- Traefik Helm chart
- Traefik Kubernetes CRDs: IngressRoute and Middleware
- Kubernetes Services, NodePort, LoadBalancer, Deployments, and Secrets
- Helm
- kubectl
- talosctl
- Cilium CNI

## Sources Consulted
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- Traefik Kubernetes installation guide: https://doc.traefik.io/traefik/master/setup/kubernetes/
- Traefik API and dashboard documentation: https://doc.traefik.io/traefik/master/reference/install-configuration/api-dashboard/
- Traefik Kubernetes CRD provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/kubernetes/kubernetes-crd/
- Traefik IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/middleware/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Talos networking resources: https://docs.siderolabs.com/talos/v1.6/learn-more/networking-resources
- Talos for Linux administrators: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-for-linux-admins
- Talos Cilium deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium

## Issues Found
- The Traefik Helm commands used `dashboard.enabled=true`, which is not the current chart value for enabling the dashboard. Changed it to `api.dashboard=true` and enabled the chart's dashboard IngressRoute with `ingressRoute.dashboard.enabled=true`.
- The Traefik Helm commands used `service.type`, but the current chart puts the Service type under `service.spec.type`. Updated both NodePort and LoadBalancer examples.
- The dashboard port-forward command targeted `svc/traefik` on port 9000, but the chart does not expose the `traefik` entryPoint on the Service by default. Changed it to port-forward the Traefik Deployment.
- The production dashboard IngressRoute matched only the host. Updated the rule to match the dashboard and API paths, following Traefik's dashboard routing documentation.
- The dashboard authentication example referenced `dashboard-auth-secret` but did not define it. Added a Kubernetes `kubernetes.io/basic-auth` Secret example.
- The Cilium check implied Cilium is always the CNI. Clarified that the command applies when using Cilium.
- The scaling command used `replicas=3`, but the current Traefik Helm chart uses `deployment.replicas`. Updated the command.
- The scaling note assumed kube-proxy is always responsible for NodePort traffic. Adjusted the wording to include kube-proxy replacement implementations used by some CNIs.

## Review Notes
The guide is technically relevant and salvageable. It now aligns with the current Traefik Helm chart values and official Traefik dashboard/CRD examples. A future improvement would be to pin a Traefik chart version so the guide remains reproducible if chart values change again.
