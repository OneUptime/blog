# Validation Summary: How to Configure Istio with Azure Application Gateway

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- Azure Application Gateway
- Azure Application Gateway Ingress Controller (AGIC)
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes Ingress
- Azure Web Application Firewall (WAF)

## Sources Consulted
- Azure CLI reference for `az network application-gateway`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Azure CLI reference for `az network application-gateway waf-policy`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy
- Azure CLI reference for Application Gateway WAF custom rules and match conditions: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/custom-rule and https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy/custom-rule/match-condition
- Azure CLI reference for AKS add-ons: https://learn.microsoft.com/en-us/cli/azure/aks/addon
- Microsoft Learn AGIC annotations reference: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- Microsoft Learn AGIC add-on tutorial for existing Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-existing
- Azure Application Gateway infrastructure configuration: https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio ingress gateway examples: https://istio.io/latest/docs/examples/microservices-istio/istio-ingress-gateway/
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio ingress authorization documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/

## Issues Found
- The Istio `Gateway` snippets used `selector.matchLabels`, but Istio `Gateway.spec.selector` is a map of labels. Changed both Gateway examples to `selector: istio: ingressgateway`.
- The HTTP Istio `Gateway` listened on port `8080`, while the exposed ingress gateway service and Ingress backend use service port `80`. Changed the Gateway port to `80`.
- The HTTPS Istio `Gateway` listened on port `8443`, while external Istio Gateway configuration should match the service port exposed to Application Gateway. Changed it to `443`.
- The standalone Application Gateway example created HTTP settings before the referenced probe existed. Reordered the probe creation before `http-settings create`.
- The WAF policy example used a separate managed-rule add command after policy creation. Changed policy creation to include `--type OWASP --version 3.2`, which is supported by the Azure CLI.
- The custom WAF rule example created a `MatchRule` without a match condition. Added a concrete `User-Agent` match condition for the bad-bot example.
- The WAF association command used nonexistent `az network application-gateway waf-policy set`. Replaced it with `az network application-gateway update --set firewallPolicy.id=...`.
- The Application Gateway creation example did not explicitly create or attach a public IP. Added a Standard static public IP and passed it with `--public-ip-address`.
- The initial Application Gateway creation used frontend port `443` without an SSL certificate. Changed the initial frontend port to `80`, leaving HTTPS listener configuration to AGIC from the TLS-enabled Ingress.
- The AGIC WAF policy resource type casing did not match Microsoft documentation. Updated it to `applicationGatewayWebApplicationFirewallPolicies`.
- The end-to-end TLS annotation example omitted the AGIC trusted root certificate annotation. Added `appgw.ingress.kubernetes.io/appgw-trusted-root-certificate` and clarified that the Ingress backend must route to the Istio HTTPS service port.

## Review Notes
The post remains a high-level integration guide. In a production-ready version, the manual standalone Application Gateway section should also include listener and routing-rule creation, and the AGIC examples could mention Application Gateway for Containers as Microsoft's newer Kubernetes ingress option.
