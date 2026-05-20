# Validation Summary: How to Expose ArgoCD with Nginx Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress (`networking.k8s.io/v1`)
- ingress-nginx Controller
- Helm
- gRPC and gRPC-Web
- TLS termination and SSL passthrough
- cert-manager

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/release-3.3/operator-manual/ingress/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD TLS Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD `argocd login` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- ingress-nginx Annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx gRPC example: https://kubernetes.github.io/ingress-nginx/examples/grpc/

## Issues Found

1. **The description mentioned authentication, but the post does not configure ingress-level authentication.** Changed the description to refer to production safeguards instead.

2. **The TLS termination option implied a single HTTP ingress handles the UI, API, and native gRPC CLI traffic.** Argo CD and ingress-nginx documentation state that ingress-nginx supports only one backend protocol per Ingress object, so native gRPC needs either SSL passthrough or a separate gRPC Ingress. Clarified that Option 1 is for the UI and HTTP API and pointed readers to Options 2 and 3 for native gRPC.

3. **The HTTP backend annotation comment was misleading.** It said to use HTTPS if not running insecure while the value was `HTTP`. Updated the comment to match the `server.insecure: "true"` configuration.

4. **The SSL passthrough example incorrectly set `nginx.ingress.kubernetes.io/backend-protocol: "GRPC"`.** ingress-nginx documentation says SSL passthrough sends TLS directly to the backend and invalidates other annotations. Removed the incorrect backend protocol annotation and added the HTTPS redirect annotation used in the official Argo CD example.

5. **The two-Ingress option did not explicitly say it also requires `server.insecure: "true"`.** Added that requirement because Argo CD's documented ingress-nginx TLS termination setup runs the API server with TLS disabled.

6. **The gRPC-specific CLI example used `--grpc-web`.** For the dedicated gRPC hostname, native `argocd login grpc.argocd.example.com` is the accurate example. The verification command for the HTTP hostname now uses `--grpc-web`, which is the appropriate fallback when a proxy does not support HTTP/2 gRPC.

## Review Notes
- The YAML manifests use the current `networking.k8s.io/v1` Ingress API and valid ingress-nginx annotations.
- The examples use service port numbers (`80` and `443`) instead of named ports (`http` and `https`). Argo CD's official examples use named ports, but numeric ports are valid if the default `argocd-server` Service exposes those ports.
