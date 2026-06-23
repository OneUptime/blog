# Validation Summary: How to Debug Services with kubectl Port-Forward and Inspect Ingress Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (`kubectl port-forward`, Services, Pods, StatefulSets)
- NGINX Ingress Controller (ingress-nginx)
- Kubernetes Ingress API (`networking.k8s.io/v1`)
- TLS / certificates (`openssl s_client`)
- PostgreSQL (`psql` client connection)
- DevOps networking tooling (`dig`, `curl`, `tcpdump`/`kubectl sniff`)

## Sources Consulted
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx documentation: https://kubernetes.github.io/ingress-nginx/
- Community references confirming port-forward does not load balance across Pods (alexellis.io, inlets.dev, kubernetes/kubectl issue #1416)

## Issues Found
- **Section 2 (Port-Forward to a Service) — incorrect load-balancing claim.** The post stated that "Kubernetes routes your traffic through the Service's load balancing logic" and "Here Kubernetes load-balances across Pods, matching what clients see." This is incorrect. `kubectl port-forward` operates at the Pod level: when given a Service it resolves the Service to a single backing Pod and forwards all traffic directly to that one Pod for the life of the session, bypassing kube-proxy and the Service's load balancing. It therefore does not round-robin or replicate sticky-session behavior across Pods. The claim about testing "TLS termination" via a Service port-forward was also misleading, since Service/Ingress TLS termination is bypassed. Rewrote both the intro and follow-up paragraph to accurately describe single-Pod forwarding and explicitly note that load balancing and sticky sessions are not exercised. Also adjusted the inline comment "(which routes to backend Pods)" to "(mapped to the chosen Pod's target port)".

## Review Notes
- All other commands are syntactically correct and current: `kubectl port-forward` to `pod/`, `svc/`, and `statefulset/` resources are all valid targets; the Ingress manifest uses the correct `networking.k8s.io/v1` API with proper `ingressClassName`, `tls`, `pathType: Prefix`, and `service.port.number` fields; the `nginx.ingress.kubernetes.io/proxy-body-size` annotation is valid for ingress-nginx.
- The ingress-nginx debugging commands (`kubectl logs`, `kubectl exec ... -- nginx -T`, `kubectl get pods -n ingress-nginx`) are accurate for the default ingress-nginx deployment name/namespace.
- `kubectl sniff` is a krew plugin (not a built-in subcommand); the post correctly presents it as an optional tool alongside `tcpdump`.
- The `kubectl wait --for=condition=available deployment/...` smoke-test command is valid.
