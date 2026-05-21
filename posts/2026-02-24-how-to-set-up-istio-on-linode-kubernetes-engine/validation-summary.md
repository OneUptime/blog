# Validation Summary: How to Set Up Istio on Linode Kubernetes Engine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linode Kubernetes Engine (LKE)
- Akamai Cloud NodeBalancers and Linode Cloud Controller Manager
- Linode CLI
- Kubernetes Services, IngressClass, Secrets, PersistentVolumeClaims, and node pools
- Istio, IstioOperator, Gateway, VirtualService, PeerAuthentication, and sidecar injection
- cert-manager and ACME HTTP01
- Linode Block Storage CSI Driver
- Prometheus, Kiali, and Grafana sample addons

## Sources Consulted
- Akamai TechDocs: LKE CLI commands, https://techdocs.akamai.com/cloud-computing/docs/cli-commands-for-lke
- Akamai TechDocs: Create a Kubernetes cluster API/CLI reference, https://techdocs.akamai.com/linode-api/reference/post-lke-cluster
- Akamai TechDocs: Linode Kubernetes Engine overview, https://techdocs.akamai.com/cloud-computing/docs/linode-kubernetes-engine
- Akamai TechDocs: Load balancing on LKE, https://techdocs.akamai.com/cloud-computing/docs/get-started-with-load-balancing-on-an-lke-cluster
- Linode Cloud Controller Manager service annotations, https://linode.github.io/linode-cloud-controller-manager/docs/configuration/annotations.html
- Akamai TechDocs: Update a node pool API/CLI reference, https://techdocs.akamai.com/linode-api/reference/put-lke-node-pool-1
- Akamai TechDocs: Create a domain record API/CLI reference, https://techdocs.akamai.com/linode-api/reference/records
- Istio documentation: Install with istioctl, https://istio.io/latest/docs/setup/install/istioctl/
- Istio documentation: Installing gateways, https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio documentation: Ingress gateways, https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio documentation: Kubernetes Ingress, https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- Istio documentation: Secure gateways, https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio documentation: PeerAuthentication, https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio documentation: Prometheus integration, https://istio.io/latest/docs/ops/integrations/prometheus/
- cert-manager documentation: HTTP01 solver configuration, https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager documentation: Certificate resources/API reference, https://cert-manager.io/docs/reference/api-docs/
- Linode Block Storage CSI Driver documentation, https://linode.github.io/linode-blockstorage-csi-driver/

## Issues Found
- The LKE cluster creation command used Kubernetes `1.28`, which is outdated for a 2026 tutorial. Updated the example to `1.33`, matching current Akamai LKE examples and keeping it within Istio's currently documented Kubernetes compatibility range.
- The capacity description implied that the Kubernetes control plane runs on the worker nodes. Changed it to "Istio control plane" because LKE manages the Kubernetes control plane separately.
- The Linode load balancer annotation `service.beta.kubernetes.io/linode-loadbalancer-port-protocol` is not the current per-port annotation format. Replaced it with `service.beta.kubernetes.io/linode-loadbalancer-port-80` and `service.beta.kubernetes.io/linode-loadbalancer-port-443` JSON objects.
- The NodeBalancer health check example configured an HTTP path check against Istio's readiness path without configuring a health check port. Changed the example to a TCP connection check and clarified that `/healthz/ready` is exposed on Istio gateway status port 15021.
- The post stated that NodeBalancers operate at Layer 4 only. Adjusted the wording because Linode NodeBalancers support TCP as well as HTTP/HTTPS modes, while TCP is the relevant mode for Istio TLS termination.
- The Istio `Gateway` selector used `selector.matchLabels`, which is not the schema for Istio `Gateway`; the selector is a direct label map. Updated it to `selector: { istio: ingressgateway }`.
- The cert-manager HTTP01 solver used the legacy `class` field. Updated it to `ingressClassName` and added the required `IngressClass` resource for Istio's Kubernetes Ingress support.
- The cert-manager explanation said a Gateway and VirtualService were needed for the HTTP01 solver. Replaced that with the accurate requirement that port 80 reaches Istio and cert-manager's temporary solver Ingress is handled by the `istio` IngressClass.
- The monitoring section called Istio's sample addons "standard monitoring tools" and the storage section implied that a standalone PVC makes Prometheus persistent. Updated the wording to identify the addons as samples and clarify that the PVC is for a customized Prometheus deployment.

## Review Notes
The post is now technically valid as a walkthrough, but a production deployment should still pin exact Istio and cert-manager versions, use production-grade monitoring manifests instead of Istio samples, and test the ACME HTTP01 flow with the final Gateway/Ingress configuration before relying on it for automated renewals.
