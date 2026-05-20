# Validation Summary: How to Configure ArgoCD with HTTP/2

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- gRPC and HTTP/2
- Kubernetes Ingress and Services
- ingress-nginx
- Traefik IngressRoute
- Istio Gateway, VirtualService, and DestinationRule
- AWS Network Load Balancer
- curl, grpcurl, OpenSSL, kubectl, and argocd CLI

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD Architectural Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD `argocd login` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- ingress-nginx gRPC example: https://kubernetes.github.io/ingress-nginx/examples/grpc/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Traefik Kubernetes CRD / ServersTransport documentation: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/crd/http/serverstransport/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- AWS Load Balancer Controller service annotations: https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/main/docs/guide/service/annotations.md
- gRPC over HTTP/2 protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- gRPC core concepts: https://grpc.io/docs/what-is-grpc/core-concepts/

## Issues Found
- The introduction overstated that the web UI and all Argo CD components rely on gRPC. Updated it to match Argo CD's documented gRPC/REST API model and the CLI's native gRPC behavior.
- The HTTP/2 feature list mentioned server push as something gRPC depends on. Replaced it with full-duplex streaming, which matches gRPC's streaming model.
- The network diagram implied HTTP/1.1 could sit in the native gRPC path. Updated it to show TCP/TLS passthrough or HTTP/2 for the external path.
- The internal communication section incorrectly described API server to application controller communication as gRPC via the Kubernetes API. Reworked the bullets to distinguish Argo CD gRPC calls from Kubernetes API calls.
- The ingress-nginx TLS-termination examples mixed backend TLS settings with `GRPC`/`HTTP` backend protocols. Updated the text and YAML to require Argo CD server TLS disabled, use `HTTP` for the UI ingress, `GRPC` for the CLI ingress, named service ports, `force-ssl-redirect`, and separate TLS secrets.
- The SSL passthrough example used numeric port 443 and did not include the force redirect annotation from Argo CD's documented pattern. Updated it to use the `https` service port and `force-ssl-redirect`.
- The Traefik example used `scheme: h2c` against service port 443. Updated it to match Argo CD's documented Traefik pattern: run Argo CD server insecure, route normal HTTP traffic to port 80, and route `application/grpc` traffic to port 80 with `scheme: h2c`.
- The Istio section implied gateways automatically preserve HTTP/2 to backends. Updated the explanation and example to route to Argo CD's insecure port 80 and added a DestinationRule with `h2UpgradePolicy: UPGRADE`.
- The AWS NLB example used a deprecated cross-zone load-balancing annotation and older load balancer type guidance. Updated it to use `aws-load-balancer-attributes`, `aws-load-balancer-type: "external"`, and an explicit NLB target type.

## Review Notes
The examples are still intentionally generic and may need environment-specific changes for certificate management, hostnames, controller installation method, and whether Argo CD is installed from raw manifests, Helm, or an operator.
