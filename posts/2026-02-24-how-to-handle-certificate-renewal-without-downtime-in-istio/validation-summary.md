# Validation Summary: How to Handle Certificate Renewal Without Downtime in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy SDS
- mTLS
- X.509 certificates
- OpenSSL
- cert-manager
- kubectl
- istioctl

## Sources Consulted
- Istio Security Concepts: https://istio.io/latest/docs/concepts/security/
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Tetrate Zero-Downtime Root Certificate Rotation in Istio: https://docs.tetrate.io/istio-subscription/howto/root-cert-rotation
- OpenSSL local CLI, version 3.0.13

## Issues Found
- The introduction implied the intermediate CA certificate expires yearly. Istio's official documentation describes administrator-provided signing certificates but does not define a universal one-year lifetime, so this was changed to "eventually expires."
- The workload certificate renewal flow said rotation happens at around 80% of certificate lifetime. Current Istio documentation lists `SECRET_GRACE_PERIOD_RATIO` as `0.5` with `SECRET_GRACE_PERIOD_RATIO_JITTER` of `0.01`, so the post now states that renewal starts at about half of the certificate lifetime by default.
- The root CA rotation sequence switched the signing intermediate and the trust bundle in the same step. That can issue new-root certificates before all workloads have the new root in their trust bundle. The sequence now first distributes combined trust while keeping the old intermediate CA, then rolls workloads, then switches istiod to the new intermediate, and only later removes the old root.
- The root CA rotation commands referenced old CA files without showing how to preserve them. Added commands to extract the current `cacerts` files before updating the secret.
- The root CA rotation workload restart loops did not wait for rollout completion. Added `kubectl rollout status` checks so the next phase does not start before deployments finish rolling.

## Review Notes
- `kubectl` and `istioctl` are not installed in this local environment, so their command behavior was checked against official command documentation rather than local `--help` output.
- The gateway TLS secret update flow is consistent with Istio's documented Gateway `credentialName` behavior and SDS delivery to the ingress gateway.
