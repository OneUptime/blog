# Validation Summary: How to Troubleshoot Networking Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- CoreDNS
- EndpointSlice
- Ingress
- ingress-nginx
- Traefik
- NetworkPolicy
- K3s ServiceLB

## Sources Consulted
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Debug Services guide: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation update: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- SUSE Rancher Manager networking troubleshooting: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/troubleshooting/other-troubleshooting-tips/networking.html
- K3s Networking Services: https://documentation.suse.com/cloudnative/k3s/latest/en/networking/networking-services.html
- RKE2 Networking Services: https://documentation.suse.com/cloudnative/rke2/latest/en/networking/networking_services.html

## Issues Found
- The post used `kubectl run` examples for disposable debug pods without `--restart=Never`. I updated those commands to include `--restart=Never` and explicit commands so they match current `kubectl` behavior for one-off troubleshooting pods.
- The post used the legacy `Endpoints` resource for service troubleshooting and diagnostics. I replaced those commands with `EndpointSlice` queries because Kubernetes now documents EndpointSlices as the current backend endpoint API and has deprecated the Endpoints API in Kubernetes 1.33.
- The service troubleshooting text stated that "no endpoints" means the selector does not match running pods. I corrected this to note that, for selector-based Services, missing backend endpoints can also reflect Pod readiness state.
- The ingress troubleshooting section assumed `ingress-nginx` everywhere. I changed the initial controller checks to be controller-agnostic and scoped the NGINX config inspection step specifically to `ingress-nginx`, because Rancher-managed clusters may use different ingress controllers such as Traefik.
- The LoadBalancer troubleshooting section omitted a common Rancher/K3s case where ServiceLB leaves a Service in `Pending` if no node has the required host port available or ServiceLB is disabled. I added that case and tightened the event query to the Service resource in the correct namespace.
- The intermittent-service-failure example relied on an event reason that is not a stable generic troubleshooting signal. I replaced it with watching the Service's EndpointSlices directly.
- The final event collection command sorted by `.lastTimestamp`. I updated it to sort by `.metadata.creationTimestamp`, which matches current Kubernetes quick-reference guidance.
- The initial checklist and pod-to-pod example overemphasized ICMP ping. I changed the primary check to reaching the required application port and kept `ping` as an optional test only.

## Review Notes
- The post is now technically sound for a current Rancher/Kubernetes audience, but some commands still assume the target container image includes tools such as `ip`, `ss`, or `traceroute`. If an application image is minimal, a debug pod or ephemeral container may still be required in practice.
- Rancher-managed clusters can differ by distribution and version. In particular, ingress controller defaults differ between K3s and RKE2, and RKE2 is transitioning away from `ingress-nginx` in newer releases.
