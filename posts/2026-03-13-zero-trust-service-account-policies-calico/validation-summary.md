# Validation Summary: Zero Trust Identity with Calico Service Account Network Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source network policy
- Kubernetes service accounts
- Kubernetes RBAC
- kubectl
- Mermaid flowcharts

## Sources Consulted
- Calico Open Source documentation: Use service accounts rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico Open Source documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes documentation: Service Accounts - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes kubectl reference: kubectl set serviceaccount - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_serviceaccount/
- Mermaid documentation: Flowcharts Syntax - https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The post described the Calico-only policy as providing cryptographically verified traffic controls. I changed this to identity-aware traffic controls and clarified that cryptographic workload identity checks require integrations such as Istio or SPIFFE/SPIRE.
- The Calico top-level `serviceAccountSelector` examples used `name == ...`. Calico documents service account name selection through the `projectcalico.org/name` label, so I changed these selectors to `projectcalico.org/name == ...`.
- The ingress rule used `source.serviceAccountSelector`, which is not the Calico rule-level schema. Calico EntityRules use `serviceAccounts` with `names` or `selector`, so I changed the source match to `serviceAccounts.names`.
- The payment database service account was referenced but not created. I added creation of `payment-db-sa`.
- The service accounts were created but not assigned to workloads, so the policies would not match the intended pods. I added `kubectl set serviceaccount` commands for the assumed deployments.
- The PostgreSQL ingress allow rule specified destination port 5432 without an explicit protocol. I added `protocol: TCP` to match Calico examples and the intended PostgreSQL traffic.
- The Mermaid denied edges used `-.-x`, which is not the standard documented cross-edge syntax. I changed them to `--x`.

## Review Notes
The example assumes a `production` namespace and deployments named `payment-processor`, `order-service`, `user-service`, and `payment-db` already exist. The policies are valid for Calico's `projectcalico.org/v3` API, and the service account matching behavior was checked against current Calico documentation.
