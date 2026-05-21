# Validation Summary: How to Set Up Istio Resource Naming Conventions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio networking and security resources
- Kubernetes resource naming and labels
- OPA Gatekeeper ConstraintTemplates and constraints
- Rego policy syntax
- kubectl label selectors

## Sources Consulted
- Kubernetes Object Names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes Recommended Labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA regular expression built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/regex

## Issues Found
- The post stated that underscores are technically valid in Kubernetes resource names. This is inaccurate for DNS label and DNS subdomain style names, which allow lowercase alphanumeric characters, hyphens, and, for DNS subdomains, dots. Updated the guidance to say underscores are not allowed by those Kubernetes name forms.
- The post described 63 characters as the Kubernetes name limit. Kubernetes distinguishes DNS label names, which are limited to 63 characters, from DNS subdomain names, which can be up to 253 characters. Updated the text to frame 63 characters as the recommended DNS label-style convention rather than a universal Kubernetes limit.
- Istio networking examples used `networking.istio.io/v1beta1`. Current Istio reference documentation uses `networking.istio.io/v1` for VirtualService, DestinationRule, Gateway, and ServiceEntry examples. Updated those snippets to `networking.istio.io/v1`.
- The Gatekeeper Rego example used the deprecated `re_match` built-in. Updated it to the current `regex.match` built-in documented by OPA.

## Review Notes
The remaining Istio resource fields, Kubernetes labels, Gatekeeper schema structure, and kubectl label selector command are consistent with current official documentation. The article is intentionally about naming conventions, so several examples are illustrative and omit broader production concerns such as fully qualified service hosts, Gateway certificate provisioning, or complete EnvoyFilter patch targeting.
