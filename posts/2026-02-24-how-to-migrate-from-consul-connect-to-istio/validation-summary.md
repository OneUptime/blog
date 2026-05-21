# Validation Summary: How to Migrate from Consul Connect to Istio

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Istio service mesh
- HashiCorp Consul Connect / Consul service mesh
- Kubernetes
- Envoy sidecars
- Consul configuration entries and CRDs
- Istio PeerAuthentication, AuthorizationPolicy, VirtualService, and DestinationRule resources

## Sources Consulted
- HashiCorp Consul `consul config read` command documentation: https://developer.hashicorp.com/consul/commands/config/read
- HashiCorp Consul `consul intention create` command documentation: https://developer.hashicorp.com/consul/commands/intention/create
- HashiCorp Consul service intentions documentation: https://developer.hashicorp.com/consul/docs/secure-mesh/intention/create
- HashiCorp Consul ServiceIntentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul service resolver configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-resolver
- HashiCorp Consul service defaults configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-defaults
- HashiCorp Consul services deregister command documentation: https://developer.hashicorp.com/consul/commands/services/deregister
- HashiCorp Consul Kubernetes connect injection documentation: https://developer.hashicorp.com/consul/docs/connect/k8s/inject
- HashiCorp Consul transparent proxy documentation: https://developer.hashicorp.com/consul/docs/connect/proxy/transparent-proxy
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
- Updated Istio resource examples from `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` to the current documented `v1` API versions for PeerAuthentication, AuthorizationPolicy, DestinationRule, and VirtualService.
- Fixed the Consul `ServiceIntentions` CRD example. `sources[].action` and `sources[].permissions` are mutually exclusive for a source, and each L7 permission requires its own `action`, so the `admin-dashboard` permission now sets `action: allow` inside the permission.
- Corrected the concept mapping for Consul mesh gateways. A Consul mesh gateway is not only equivalent to Istio ingress or egress gateways; for cross-cluster or east-west mesh traffic the closer Istio concept is an east-west gateway.
- Narrowed the cross-mesh communication statement. Istio PERMISSIVE mode alone does not guarantee communication with Consul-meshed services; Consul services must also be configured to accept non-mTLS traffic during migration.
- Clarified `consul services deregister`. The command deregisters services registered with a local Consul agent, so the migration step now scopes it to directly registered services.

## Review Notes
The examples assume Kubernetes service accounts match the source service names used in Istio principals. In real migrations, service account names, namespaces, Consul namespaces, and control-plane revision labels should be checked before applying the policies.
