# Validation Summary: How to Expose ArgoCD with Ambassador/Emissary Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Emissary-Ingress / Ambassador API Gateway
- Kubernetes
- Envoy
- gRPC and gRPC-Web
- TLS termination and TLS passthrough
- Emissary Mapping, Host, Listener, AuthService, RateLimitService, and TCPMapping CRDs
- Helm and kubectl

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Emissary-Ingress Helm installation documentation: https://emissary-ingress.dev/docs/3.6/topics/install/helm/
- Emissary-Ingress 3.10 Quick Start: https://emissary-ingress.dev/docs/3.10/quick-start/
- Emissary-Ingress Host CRD documentation: https://emissary-ingress.dev/docs/3.6/topics/running/host-crd/
- Emissary-Ingress communication configuration documentation: https://emissary-ingress.dev/docs/3.9/howtos/configure-communications/
- Emissary-Ingress TLS termination documentation: https://emissary-ingress.dev/docs/3.9/howtos/tls-termination/
- Emissary-Ingress cert-manager documentation: https://emissary-ingress.dev/docs/3.8/howtos/cert-manager/
- Emissary-Ingress gRPC documentation: https://emissary-ingress.dev/docs/3.6/howtos/grpc/
- Emissary-Ingress header routing documentation: https://emissary-ingress.dev/docs/3.10/topics/using/headers/headers/
- Emissary-Ingress AuthService documentation: https://emissary-ingress.dev/docs/3.6/topics/running/services/auth-service/
- Emissary-Ingress rate limiting tutorial: https://emissary-ingress.dev/docs/3.9/howtos/rate-limiting-tutorial/
- Emissary-Ingress TCPMapping documentation: https://emissary-ingress.dev/docs/3.10/topics/using/tcpmappings/
- Emissary-Ingress Listener CRD documentation: https://emissary-ingress.dev/docs/3.8/topics/running/listener/

## Issues Found
- The post claimed automatic TLS with ACME support for Emissary-Ingress. Open-source Emissary requires a certificate secret, commonly managed externally with cert-manager, so the claim and TLS Host example were changed to use a Kubernetes TLS secret.
- The install commands applied Emissary 3.9.1 CRDs but installed an unpinned Helm chart and did not wait for the CRD conversion deployment. The Helm command now pins version 3.9.1, waits for install completion, and waits for `emissary-apiext`.
- The Emissary 3.x examples omitted required Listener resources. Listener resources were added for HTTP/HTTPS routing and for the TCP passthrough example.
- The Argo CD gRPC Mapping used exact `headers` matching for `Content-Type: application/grpc`. This was changed to `regex_headers` with `^application/grpc.*$`, matching Argo CD and Emissary guidance for gRPC content types.
- The Argo CD CLI gRPC Mapping did not account for the CLI including the port in the request host header. The gRPC Mapping now matches `host: argocd.example.com:443` and notes when to use the host without the port.
- The verification command used `argocd login ... --grpc-web` even though the tutorial configures native gRPC routing. It was changed to `argocd login argocd.example.com`.
- The rate limiting Mapping used an invalid label shape with `header` and `default`. It was changed to the documented `request_headers` structure and the `RateLimitService` domain was made explicit.
- The TLS passthrough example configured a Host and `TCPMapping.spec.host`, which would cause Emissary to terminate TLS rather than pass it through. The example now uses a TCP Listener and a TCPMapping without `host`, with a note explaining why.
- The TLS troubleshooting section still referenced ACME HTTP-01 after the TLS configuration was corrected. It now checks the Kubernetes TLS secret and Host status.

## Review Notes
The post is now technically consistent with the current Emissary 3.x resource model and Argo CD's official Ambassador/Emissary ingress guidance. Operators may still need to adjust Listener ports if their Emissary Service maps external ports to different target ports.
