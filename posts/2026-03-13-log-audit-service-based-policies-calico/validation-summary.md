# Validation Summary: How to Log and Audit Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Calico policy `Log` actions
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes API audit logging
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico Open Source documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes documentation: Services, EndpointSlices, and deprecated Endpoints API - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes blog: Kubernetes v1.33 transition from Endpoints to EndpointSlices - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The example policy allowed service traffic but did not include a Calico `Log` action, so it did not actually log matching service traffic. Added a `Log` rule before the `Allow` rule because Calico documents `Log` as non-terminating and recommends pairing it with an explicit allow rule.
- The prerequisites did not mention that Calico service matches are only supported with the Kubernetes datastore driver and are ignored with the etcd datastore driver. Added the Kubernetes datastore prerequisite.
- The introduction mentioned Kubernetes Service change events without requiring or naming Kubernetes API audit logging. Clarified that these events come from Kubernetes API audit logs and added that prerequisite.
- The commands used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated as of Kubernetes v1.33. Replaced those checks with `kubectl get endpointslice -l kubernetes.io/service-name=backend-api`.
- The troubleshooting command queried `allow-frontend-to-backend`, which did not match the policy name created by the example. Updated it to query `example-service-policy`.
- The troubleshooting comment said `calicoctl get networkpolicies -n production -o wide` lists all policies affecting frontend pods. That command lists namespace policies, not only policies affecting a specific pod. Updated the comment to say to inspect namespace policies and selectors.
- The architecture diagram implied a policy update occurs when the Service scales and that an unrelated unauthorized pod is denied by this egress policy. Updated the diagram to show no policy update is needed for service scaling and that other egress from selected frontend pods is denied unless otherwise allowed.

## Review Notes
The Calico `destination.services.name` and `destination.services.namespace` syntax is valid for `projectcalico.org/v3` NetworkPolicy with the Kubernetes datastore. Calico automatically detects endpoint addresses and ports from the referenced Service, so the scaling and pod replacement claims are accurate when the Service has healthy EndpointSlices. Policy log output location depends on the Calico dataplane and node logging configuration, so future improvements could add a short command for viewing iptables or eBPF policy logs.
