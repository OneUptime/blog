# Validation Summary: How to Validate Application-Layer Policy with Calico and Istio Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico application layer policy
- Istio service mesh
- Dikastes sidecar
- Kubernetes
- kubectl
- YAML

## Sources Consulted
- Calico documentation: Enforce Calico network policy for Istio service mesh: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Use HTTP methods and paths in policy rules: https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Istio documentation: Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes documentation: kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy`. Calico documents application layer HTTP matching on Calico `NetworkPolicy` and `GlobalNetworkPolicy`, not an `ApplicationPolicy` resource, so the text was corrected to `NetworkPolicy` with HTTP match criteria.
- The post claimed policy matching on HTTP headers. The Calico Open Source `HTTPMatch` reference documents `methods` and `paths`, so the header references were removed.
- The policy example used an application-layer `http` match clause with `action: Deny`. Calico documents that rules containing application layer match criteria must use `action: Allow`, so the explicit `Deny` rule was removed. The denied test now relies on Dikastes default-deny behavior for unmatched HTTP requests.
- The setup commands checked for Calico components in `istio-system` and for a standalone `dikastes` pod in `calico-system`, but current Calico documentation injects Dikastes as a sidecar into workloads using Istio injection templates. The verification commands were changed to check Calico system pods and the Istio sidecar injector ConfigMap for the `dikastes` template.
- The namespace label command was made idempotent with `--overwrite`, matching Istio's documented sidecar injection examples.
- The setup section enabled ordinary Istio namespace injection but did not ensure the backend workload used the `sidecar,dikastes` injection templates. A deployment patch command was added to set `inject.istio.io/templates: sidecar,dikastes` on the backend pod template.
- The architecture diagram used `/api/admin` while the example policy and test used `/api/v1/admin`. The diagram was corrected for consistency.
- The conclusion repeated "with Calico and Istio" and repeated the unsupported header claim. The sentence was corrected while preserving the original point.

## Review Notes
The corrected example is still environment-dependent: the backend service, pod names, labels, and port must exist as shown. Current Calico documentation also notes version-specific requirements for Istio and Kubernetes native sidecars, so production users should confirm the Calico, Istio, and Kubernetes compatibility matrix for their installed versions.
