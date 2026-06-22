# Validation Summary: How to Configure IPv6 Ingress with NGINX Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (dual-stack IPv4/IPv6 networking)
- NGINX Ingress Controller (ingress-nginx)
- Helm
- CNI plugins (Calico, Cilium, Flannel, Weave Net)
- Cloud load balancers (AWS NLB, GCP, Azure)
- MetalLB (bare metal load balancing)
- Prometheus / Grafana (monitoring)
- IPv6 networking concepts

## Sources Consulted
- Kubernetes Dual-stack GA blog: https://kubernetes.io/blog/2021/12/08/dual-stack-networking-ga/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx Annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- kubectl `--short` flag deprecation/removal discussion: https://github.com/kubernetes/kubernetes/issues/115130
- AWS Load Balancer Controller annotations (dualstack IP address type)

## Issues Found

1. **Removed `IPv6DualStack` feature gate set on kube-apiserver and kube-controller-manager.** The post recommended Kubernetes 1.23+ yet passed `--feature-gates=IPv6DualStack=true`. This gate went GA and was *removed* in 1.23, so setting it on 1.23+ causes the component to fail to start ("unrecognized feature gate"). Removed both occurrences and updated the comment to explain dual-stack is on by default since 1.23.

2. **`kubectl version --short` uses a removed flag.** The `--short` flag was deprecated and later removed (errors with "unknown flag: --short" on current kubectl). Changed to `kubectl version`.

3. **Invalid Ingress annotation `nginx.ingress.kubernetes.io/use-forwarded-headers`.** `use-forwarded-headers` is a global ConfigMap-only setting in ingress-nginx; there is no per-Ingress annotation equivalent, so this annotation has no effect. Removed it (the setting is still correctly shown in the ConfigMap sections of the post).

4. **Invalid `enable-ssl-chain-completion` in `extraArgs`.** This key is not a valid controller command-line argument (it was a ConfigMap option, now removed), and its comment incorrectly claimed it enables "IPv6 for upstream connections." Removed the misleading `extraArgs` block.

5. **Deprecated annotation `service.beta.kubernetes.io/external-traffic: OnlyLocal`.** This is a legacy beta annotation that has been replaced by the `externalTrafficPolicy: Local` field — which the same Service spec already sets. Removed the redundant deprecated annotation.

6. **Invalid IPv6 literal `2001:db8:trusted::/48`.** "trusted" contains non-hexadecimal characters, so the address would not parse. Changed to the valid documentation prefix `2001:db8:1::/48`.

7. **Inaccurate comment on `enable-real-ip`.** The comment said "Enable IPv6 resolver"; `enable-real-ip` enables NGINX's real IP module, not a resolver. Corrected the comment.

## Review Notes
- The `kubernetes.io/ingress.class: nginx` annotation appears alongside the modern `ingressClassName: nginx` field in several examples. The annotation is deprecated but still functional; left as-is since the posts also use the correct `ingressClassName`. Could be dropped in a future revision.
- `enable-real-ip` is a valid ConfigMap key; `compute-full-forwarded-for` and `use-forwarded-headers` were also verified as valid ConfigMap keys.
- The Cloudflare IPv6 ranges listed for `whitelist-source-range`/`set_real_ip_from` match Cloudflare's published IPv6 prefixes.
- The "340 undecillion" IPv6 address claim is accurate (2^128 ≈ 3.4 × 10^38).
- `securityContext.allowPrivilegeEscalation: true` in the manual Deployment is permissive; current ingress-nginx defaults to `false` with `NET_BIND_SERVICE`. Not a correctness error, but worth tightening for production.
- ingress-nginx image `v1.9.5` is a real release; readers should check for newer patch releases over time.
