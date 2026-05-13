# Validation Summary: How to Migrate to Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes Services
- Kubernetes EndpointSlice
- calicoctl
- kubectl

## Sources Consulted
- Calico service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The prerequisites did not mention that Calico `services` matches are only supported with the Kubernetes API datastore and are ignored by the etcd datastore driver. Added the Kubernetes API datastore prerequisite.
- The examples used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated as of Kubernetes v1.33. Replaced those checks with `kubectl get endpointslice -l kubernetes.io/service-name=backend-api`.
- The troubleshooting comment said `calicoctl get networkpolicies -n production -o wide` lists all policies affecting frontend pods. That command lists namespace policies, not only policies that match a specific pod. Updated the comment to say it lists namespace policies for selector review.
- The architecture diagram implied a policy update is required when the Service scales. Changed it to show that no policy update is needed.
- The architecture diagram implied any unauthorized pod is denied by this egress policy. Updated it to show other egress from the selected frontend pods is denied unless another allow policy exists.

## Review Notes
The Calico `destination.services.name` and `destination.services.namespace` example is valid for `projectcalico.org/v3` NetworkPolicy when using the Kubernetes datastore. Calico service rules can also be used in ingress `source.services` rules, but the post's egress-focused example is technically correct.
