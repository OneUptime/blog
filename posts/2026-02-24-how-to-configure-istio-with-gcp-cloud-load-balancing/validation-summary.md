# Validation Summary: How to Configure Istio with GCP Cloud Load Balancing

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio
- Google Kubernetes Engine
- Google Cloud Load Balancing
- Google Cloud Armor
- Cloud CDN
- Kubernetes Services and Gateway API
- Network Endpoint Groups
- gcloud CLI

## Sources Consulted
- GKE standalone NEG documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/standalone-neg
- GKE load balancing overview: https://cloud.google.com/kubernetes-engine/docs/concepts/about-load-balancing
- GKE internal LoadBalancer Service documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- GKE Gateway deployment documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- GKE GatewayClass capabilities: https://cloud.google.com/kubernetes-engine/docs/how-to/gatewayclass-capabilities
- Google Cloud external Application Load Balancer documentation: https://cloud.google.com/load-balancing/docs/https
- Google Cloud proxy Network Load Balancer documentation: https://cloud.google.com/load-balancing/docs/proxy-network-load-balancer
- Google Cloud zonal NEG documentation: https://cloud.google.com/load-balancing/docs/negs/zonal-neg-concepts
- Google Cloud health checks documentation: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud Armor preconfigured WAF documentation: https://cloud.google.com/armor/docs/waf-rules
- Google Cloud Armor WAF configuration documentation: https://cloud.google.com/armor/docs/configure-waf
- gcloud backend services reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- gcloud target HTTPS proxies reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- gcloud target TCP proxies reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-tcp-proxies/create
- gcloud target TCP proxy update reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-tcp-proxies/update
- Istio Gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/

## Issues Found
- The standalone NEG annotation used Istio container target ports `8080` and `8443`. GKE standalone NEG `exposed_ports` keys refer to Kubernetes Service ports, so the snippet now uses `80` and `443`.
- The Istio `Gateway` server used port `8080`, which does not match the public Service port used by the HTTP load balancer. It now uses port `80`.
- The Istio `Gateway` selector used `matchLabels`, which is not the schema for Istio `Gateway.spec.selector`. It was changed to a direct selector map.
- The Cloud Armor examples used `evaluatePreconfiguredExpr()`. Current Google Cloud Armor documentation uses `evaluatePreconfiguredWaf()` for preconfigured WAF rule sets, so the SQLi and XSS expressions were corrected and given documented sensitivity values.
- The target HTTPS proxy and target TCP proxy examples did not explicitly mark the resources as global. The commands now include `--global` to match the global forwarding rules and backend services.
- The `numTrustedProxies` recommendation was set to `2` because the gateway was counted as an extra hop. Istio expects the number of trusted proxies in front of the gateway, so the example now uses `1` for a single Google Cloud HTTP(S) load balancer.
- The PROXY protocol example only enabled PROXY protocol on the Google Cloud TCP target proxy. Istio must also be configured to accept PROXY protocol, so an IstioOperator snippet for `gatewayTopology.proxyProtocol` was added.

## Review Notes
The manually created standalone NEG load balancer examples are zone-specific. In a multi-zone or regional GKE cluster, GKE creates one zonal NEG per cluster zone, and each relevant zonal NEG should be added to the backend service. The example remains a single-zone command for brevity.
