# Validation Summary: Common Mistakes to Avoid with Calico and Istio Application-Layer Policy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source network policy
- Calico application layer policy
- Istio service mesh
- Dikastes sidecar
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Open Source documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration
- Kubernetes documentation: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Calico documents application-layer matches on `NetworkPolicy` and `GlobalNetworkPolicy`, so the text was corrected to name those resources.
- The post claimed Calico application-layer policy can match HTTP headers. The Calico Open Source policy reference documents HTTP method and path matching for this feature, so the text was narrowed to methods and paths.
- The prerequisites used a specific Calico v3.26+ requirement but did not mention current Istio and Kubernetes requirements. The prerequisites were updated to align with current Calico documentation for Istio v1.22+ and Kubernetes v1.29+.
- The sample policy used an `http` match block with `action: Deny`. Calico documents that rules containing application-layer match clauses must use `action: Allow`, so the deny rule was changed to a network-layer deny for remaining traffic from the frontend after the explicit allowed HTTP requests.
- The setup commands checked for Dikastes in `calico-system`, but Dikastes is injected into workload pods and the Calico CSI driver runs in `calico-system`. The verification commands were updated to check the Istio injector templates, the CSI driver pods, and the injected workload container list.
- The architecture diagram denied path did not match the test command path. It was corrected from `/api/admin` to `/api/v1/admin`.

## Review Notes
The YAML snippet parses successfully. `kubectl` is not installed in this local environment, so CLI commands were reviewed against the official Kubernetes command reference and Calico documentation rather than executed locally.
