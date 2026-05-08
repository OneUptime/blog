# Validation Summary: Validate Calico Tier Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico tiers
- Calico GlobalNetworkPolicy
- Calico tiered-policy RBAC
- Kubernetes `kubectl`
- `calicoctl`
- Felix Prometheus metrics
- Python JSON parsing

## Sources Consulted
- Calico Enterprise Tier resource documentation: https://docs.tigera.io/calico-enterprise/latest/reference/resources/tier
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Cloud GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico-cloud/reference/resources/globalnetworkpolicy
- Calico Enterprise RBAC for tiered policies documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes kubectl reference documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The test traffic command attempted to reach `http://target.test` after creating only a Pod named `target`. Kubernetes does not create a Service DNS name for a standalone Pod. I added creation of the `test` namespace if needed, exposed the `target` Pod as a Service, waited for the Pods to become Ready, changed the request to `http://target.test.svc.cluster.local`, and added Service cleanup.
- The RBAC validation used `kubectl auth can-i` with `--subresource=security.*`. Calico Enterprise documentation explicitly notes that `kubectl auth can-i` cannot be used to check RBAC for tiered policy, and Calico tiered RBAC uses pseudo resources such as `tier.globalnetworkpolicies` with `resourceNames` such as `security.*`. I replaced the commands with inspection of the relevant bound ClusterRoles and comments describing the expected tiered-policy grants.
- The Felix metric section described `felix_active_local_policies` as checking all tier policies or policies per tier. Official Felix metrics document this as the number of active policies on the local host. I updated the step title and comment to describe host-level active policy verification.
- The prerequisites implied Tier support was limited to Calico Enterprise or Calico Cloud. Current Calico documentation includes Tier resources in Calico as well, so I generalized the prerequisite to Calico with Tier support.

## Review Notes
The examples remain environment-dependent: policy names, ClusterRole names, and the expected allow/deny result depend on the cluster's actual Calico tier and policy configuration. The post now avoids commands that are technically invalid for Calico tiered RBAC and keeps the validation flow consistent with the official Calico behavior that lower tier order values have higher precedence.
