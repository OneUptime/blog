# Validation Summary: How to Test Zero Trust Network Policy in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico NetworkPolicy
- Kubernetes network policy behavior
- kubectl
- curl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico service policy examples: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy

## Issues Found
- The introduction stated that nothing is permitted by default. Calico follows Kubernetes pod policy semantics: pods are default-allow until one or more matching ingress or egress policies apply. I clarified that the strict default-deny behavior applies after default-deny policies select the traffic.
- The introduction claimed comprehensive logging of every traffic decision. Calico supports `Log` as a policy rule action, but the example policies do not configure logging. I changed the claim to optional log rules for decisions that need audit visibility.
- The application allow policy permitted ingress to the API pods but did not allow egress from frontend pods. Because the global default deny includes egress, the verification command from `frontend-pod` to `backend-api:8080` would be blocked. I added a matching frontend egress NetworkPolicy for TCP port 8080.
- The default-deny verification command used `random-ip` as a host, which would test DNS/name resolution rather than network policy if used literally. I changed it to `$UNAUTHORIZED_POD_IP` so the command targets a real disallowed pod IP selected during testing.
- The architecture diagram showed the default-deny GlobalNetworkPolicy before the lower-order allow policies. Calico applies lower `order` values first, so I updated the diagram to show system and application allow policies before the high-order default deny.

## Review Notes
- The sample global default deny with `selector: all()` is valid but broad. Calico documentation recommends keeping global default-deny scope away from system namespaces unless required system traffic has been carefully allowed and tested in staging.
