# Validation Summary: How to Deploy IPv6 Kubernetes Manifests with GitOps

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Deployments
- Kubernetes probes
- Kustomize
- Argo CD
- Flux CD
- IPv6
- Dual-stack networking
- GitOps

## Sources Consulted
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl` JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- RFC 3493, Basic Socket Interface Extensions for IPv6: https://datatracker.ietf.org/doc/rfc3493/
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/rfc3849/

## Issues Found
- Several example IPv6 literals were invalid because they used non-hex text inside the address, including `2001:db8::redis`, `2001:db8:clients::/48`, `2001:db8:lb::/48`, `fd00:proxy::/64`, `2001:db8::ntp`, `2001:db8:app::`, and `fd00:pod::1`. These were replaced with valid documentation or ULA-style example addresses and prefixes.
- The LoadBalancer example mixed in provider-specific annotations inaccurately. In particular, `cloud.google.com/load-balancer-type: "External"` does not itself enable IPv6 on GKE, and dual-stack load balancer requirements vary by provider. The example was corrected to a provider-neutral manifest with an explanatory comment.
- The Kustomize overlay used deprecated `bases:` syntax. This was updated to `resources:` to match current Kustomize documentation.
- The deployment section overstated the effect of binding to `[::]:8080`. IPv4 reachability from a single IPv6 listener depends on application/runtime socket behavior rather than Kubernetes dual-stack alone. The wording was corrected, and the raw `BIND_ADDRESS` example was changed from bracketed URI-style syntax to `::`.
- The health-check explanation was too broad. Kubernetes HTTP probes target the Pod IP unless `httpGet.host` is set; the wording was updated to reflect that behavior.
- The validation commands used `-o jsonpath=... | jq .`, but Kubernetes documents JSONPath output as being rendered through `String()`, which is not guaranteed to be valid JSON. These commands were updated to use `jsonpath-as-json`.
- The `kubectl run` example was tightened by adding `--restart=Never`, matching current `kubectl run` semantics for an attached, auto-removed debug Pod.

## Review Notes
- Dual-stack `Service` fields such as `ipFamilyPolicy` and `ipFamilies` are correct, but successful IPv6 or dual-stack `LoadBalancer` provisioning still depends on cluster networking, CNI support, and cloud-provider-specific requirements.
- Using `::` is correct for a raw IPv6 bind address value, while `[::]:PORT` is appropriate when the application expects a combined host-and-port string.
