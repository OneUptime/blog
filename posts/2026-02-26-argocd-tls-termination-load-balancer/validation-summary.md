# Validation Summary: How to Configure ArgoCD with TLS Termination at Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress and Service resources
- ingress-nginx
- AWS Load Balancer Controller and Network Load Balancers
- Google Kubernetes Engine Ingress and Google-managed certificates
- cert-manager
- TLS, HSTS, OCSP, and X-Forwarded headers
- Argo CD CLI

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD CLI login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- GKE Google-managed SSL certificates: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- GKE container-native load balancing through Ingress: https://cloud.google.com/kubernetes-engine/docs/how-to/container-native-load-balancing
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The diagram claimed Argo CD CLI traffic used native gRPC over TLS and HTTP/2 h2c to the backend for the single HTTP ingress example. Updated it to gRPC-Web over HTTPS and plain HTTP to match the `--grpc-web` verification command and the HTTP backend configuration.
- The post stated Argo CD must always disable built-in TLS for TLS termination. Clarified that this is required only when the load balancer forwards plain HTTP; HTTPS backend forwarding is also valid when configured consistently.
- The ingress-nginx example used `ssl-protocols`, `hsts`, `hsts-max-age`, and `hsts-include-subdomains` as Ingress annotations. Those are ingress-nginx ConfigMap settings, so they were moved to the security hardening ConfigMap example.
- The AWS NLB example used `aws-load-balancer-type: "nlb"`, which is not the current AWS Load Balancer Controller value for Services reconciled by the controller. Updated it to `external`, added `aws-load-balancer-nlb-target-type: "ip"`, set the scheme to `internet-facing`, and added a current frontend TLS negotiation policy annotation.
- The GCP example showed a `LoadBalancer` Service with a NEG annotation and called it a managed-certificate setup. Google-managed certificates for GKE are attached to Ingress resources, so the example was replaced with a `ManagedCertificate`, ClusterIP Service with NEG annotation, and GKE Ingress.
- The X-Forwarded headers section used ingress-nginx ConfigMap keys as Ingress annotations and described `server.rootpath` as a proxy trust setting. Updated the section to show ingress-nginx ConfigMap settings and clarified that `server.rootpath` is for subpath deployments.
- The troubleshooting guidance for backend protocol mismatches only mentioned HTTP and HTTPS. Expanded it to include `GRPC`/`GRPCS` where a dedicated native gRPC ingress is used.

## Review Notes
The main Nginx Ingress example supports the UI and Argo CD CLI with `--grpc-web`. Native gRPC with ingress-nginx still requires a dedicated gRPC ingress or a TLS passthrough design, as documented by Argo CD.
