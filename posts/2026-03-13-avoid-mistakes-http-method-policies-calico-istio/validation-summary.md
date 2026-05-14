# Validation Summary: Common Mistakes to Avoid with Calico and Istio HTTP Method Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico application layer policy
- Istio sidecar injection
- Dikastes sidecar
- Kubernetes
- HTTP methods and paths

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The introduction referred to `ApplicationPolicy`, but current Calico resource documentation lists `NetworkPolicy` and `GlobalNetworkPolicy` for HTTP match rules. Updated the wording to use those supported resources.
- The post said Calico HTTP policy can reference headers. Current Calico HTTPMatch documentation lists methods and paths for this policy type. Removed header references.
- The example used a `Deny` rule with an `http` match clause. Calico documentation states application layer policy match clauses are ingress-only and rules containing them must use `action: Allow`. Removed the invalid deny rule and relied on default-deny behavior for unmatched HTTP requests.
- The setup command checked for Dikastes in `calico-system`, but Dikastes is injected into workload pods. Updated the verification to check the Istio sidecar injector config and the workload pod container list.
- The setup command also looked for Calico pods in `istio-system`, which is not part of the documented verification flow. Replaced it with checks for Felix policy sync and the Calico CSI driver.
- The prerequisites did not mention Kubernetes native sidecar support. Updated the Kubernetes and Istio version prerequisites to match the current Calico documentation.
- Added `--overwrite` to the namespace labeling command so it works when the namespace label already exists.
- The denied-request test printed `$?`, but `curl` can exit successfully for an HTTP 403 response unless configured otherwise. Updated the command to print response headers and clarified that HTTP 403 is the expected result.

## Review Notes
The policy remains a minimal example. In a production guide, it would be useful to show the workload pod template annotation `inject.istio.io/templates: sidecar,dikastes` and to call out that existing pods must be recreated after enabling namespace injection.
