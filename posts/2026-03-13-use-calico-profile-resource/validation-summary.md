# Validation Summary: Use Calico Profile Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Profile resources
- Calico WorkloadEndpoint resources
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes namespace policy selectors
- calicoctl
- YAML
- Python JSON processing

## Sources Consulted
- Calico Profile resource documentation: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The post recommended Profile `ingress` and `egress` rules as active design patterns. Calico documents Profile policy rules as deprecated in favor of NetworkPolicy and GlobalNetworkPolicy, so the introduction, Usage Pattern 2, Usage Pattern 3, and conclusion were updated to frame those rules as legacy/deprecated.
- The namespace inheritance verification example checked WorkloadEndpoint metadata labels for labels from `labelsToApply`. Profile `labelsToApply` applies labels to endpoints through profile membership; the safer operational check is that the endpoint references the namespace profile. The example was changed to print `spec.profiles`.
- The reusable profile example used `source.ports: [22]` for SSH, which matches the source port rather than the destination port. The SSH rule was corrected to match `destination.ports: [22]` with the management CIDR under `source.nets`.
- The profile rule examples matched destination ports without specifying protocols. The examples were updated with explicit `protocol: TCP` for HTTP, HTTPS, SSH, and PostgreSQL, and both UDP and TCP DNS rules for port 53.
- The WorkloadEndpoint example described adding a bare-metal server, but Calico WorkloadEndpoint represents an interface connecting a container or VM to its host. The wording and node name were corrected to use a VM workload endpoint, and `interfaceName` was added to match the documented WorkloadEndpoint schema more closely.

## Review Notes
Calico allows `calicoctl` management of WorkloadEndpoint resources, but the official documentation notes that their lifecycle is generally handled by an orchestrator-specific plugin and recommends using `calicoctl` mainly to view this resource type. The post now avoids presenting WorkloadEndpoint creation as the normal Kubernetes path.
