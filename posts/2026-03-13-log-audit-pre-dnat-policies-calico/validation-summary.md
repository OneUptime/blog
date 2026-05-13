# Validation Summary: How to Log and Audit Pre-DNAT Policies for Calico Host Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Pre-DNAT policy
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Pre-DNAT policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico host forwarded traffic documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix configuration reference for Log action settings: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The policy was described as a log/audit policy but did not include any `Log` action rules. Added explicit `Log` rules before the terminal `Allow` and `Deny` rules because Calico documents `Log` as a valid rule action and states that processing continues to the next rule after a log action.
- The rules matched destination ports without specifying a transport protocol. Added `protocol: TCP` to the log, allow, and deny rules so the NodePort examples are explicit and match Calico's documented port-rule examples.
- The prerequisites said host endpoints must be configured but did not note that the sample selector depends on labels. Updated the prerequisite to say host endpoints must be configured and labeled for the target nodes, since `selector: node == 'production-node'` selects endpoint labels.
- The implementation did not mention where the Log action output should be reviewed. Added a short note to review matching Log action output in the node's configured Calico log destination.

## Review Notes
- The `preDNAT: true` and `applyOnForward: true` combination is correct for host endpoint policy that should evaluate forwarded NodePort traffic before destination NAT.
- Calico documentation states that pre-DNAT policy must use ingress policy only; the example correctly uses only `types: Ingress` and `ingress` rules.
- The exact log location depends on the node logging stack and Felix logging configuration, so the post avoids hard-coding a single log file or command.
