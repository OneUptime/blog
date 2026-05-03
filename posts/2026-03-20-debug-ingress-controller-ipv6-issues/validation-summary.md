# Validation Summary: How to Debug Ingress Controller IPv6 Issues

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Kubernetes (kubectl, Services, ConfigMaps, podCIDRs)
- NGINX Ingress Controller (ingress-nginx)
- IPv6 networking (dual-stack, wildcard binding)
- CNI plugins (Calico, Cilium)
- MetalLB
- CoreDNS
- curl, ping6

## Sources Consulted
- ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/ (specifically `use-ipv6` and `bind-address` options)
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- NGINX `listen` directive docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- curl manpage (`-6` flag for forcing IPv6)
- ingress-nginx Helm chart standard labels (`app.kubernetes.io/name`, `app.kubernetes.io/component`)

## Issues Found
1. **Step 3 wording inaccuracy**: The original text claimed "NGINX Ingress requires explicit configuration to listen on IPv6." This is misleading — the `use-ipv6` ConfigMap option defaults to `true` in ingress-nginx, so IPv6 listening is enabled out of the box. Updated the sentence to reflect that IPv6 is enabled by default and the debugging step is to verify it has not been disabled. The example ConfigMap snippet itself remains valid (explicitly setting `use-ipv6: "true"` is a no-op but harmless).

## Review Notes
- The `bind-address: "::,0.0.0.0"` value is valid syntax for the ingress-nginx ConfigMap (comma-separated list of bind addresses), and renders to `listen 0.0.0.0:80;` and `listen [::]:80;` in nginx.conf. It is somewhat redundant with the default wildcard behavior but is not incorrect.
- The label selector `app.kubernetes.io/name=ingress-nginx` may match both controller and admission-webhook pods; for stricter targeting, users could add `,app.kubernetes.io/component=controller`. Not a correctness issue, just a refinement.
- `ping6` is deprecated on many modern distros in favor of `ping -6` but still ships and works on most systems.
- `kubectl exec ... -- /bin/bash` works for the official `registry.k8s.io/ingress-nginx/controller` image, which ships bash. If a user is on a slimmed image, `/bin/sh` would be a safer fallback.
- The example IPv6 address `2001:db8::1` is correctly chosen from the RFC 3849 documentation prefix.
- All `kubectl`, `curl`, and NGINX listen directive syntax is correct.
