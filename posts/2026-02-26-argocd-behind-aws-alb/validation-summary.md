# Validation Summary: How to Configure ArgoCD Behind AWS Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes Ingress and Service resources
- AWS Application Load Balancer
- AWS Load Balancer Controller
- Amazon EKS
- AWS Certificate Manager
- Route53 / ExternalDNS
- gRPC, gRPC-Web, HTTP/2, and TLS termination

## Sources Consulted
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- AWS Load Balancer Controller ingress annotations: https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/main/docs/guide/ingress/annotations.md
- AWS Application Load Balancer target group health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS ALB gRPC launch announcement: https://aws.amazon.com/about-aws/whats-new/2020/10/application-load-balancers-enable-grpc-workloads-end-to-end-http-2-support/
- Amazon EKS AWS Load Balancer Controller Helm installation guide: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html

## Issues Found
- The main Ingress used `alb.ingress.kubernetes.io/backend-protocol-version: HTTP2` while describing the simpler gRPC-Web path. Removed that setting from the default web UI / gRPC-Web target group because Argo CD's ALB documentation recommends a separate target group for native gRPC traffic.
- The HTTP-to-HTTPS redirect annotation was present with only an HTTPS listener. Updated `listen-ports` to include both HTTP 80 and HTTPS 443 so `alb.ingress.kubernetes.io/ssl-redirect: "443"` can take effect.
- The examples used the older `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: alb`, which is the current Kubernetes Ingress field.
- The native gRPC example routed directly to the normal `argocd-server` service and used an HTTP `/healthz` health check. Added a separate gRPC Service, routed the gRPC Ingress to that service, and changed the health check to `/grpc.health.v1.Health/Check` with success code `0`, matching Argo CD and ALB gRPC health-check guidance.
- The second Ingress claimed to be grouped with the main ALB, but the main Ingress did not define the same IngressGroup. Added `alb.ingress.kubernetes.io/group.name` and group order to the main Ingress.
- Clarified that an ACM certificate for ALB must be in the same AWS Region as the ALB and that the native gRPC hostname must be covered by the certificate.
- Clarified that the AWS Load Balancer Controller Helm install assumes the required IAM policy and service account already exist.
- Corrected the timing of native ALB gRPC support from "late 2020" to "October 2020".
- Tightened the mixed-content troubleshooting note so it points to Argo CD's external URL setting instead of implying `server.insecure` alone handles proxy URL awareness.

## Review Notes
The corrected post is technically valid for the documented approach. For production, readers should still align the exact AWS Load Balancer Controller version, subnet discovery, IAM permissions, and certificate SANs with their cluster and AWS account setup.
