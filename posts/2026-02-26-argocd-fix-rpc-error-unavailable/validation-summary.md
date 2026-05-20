# Validation Summary: How to Fix 'rpc error: code = Unavailable' in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- gRPC and gRPC-Web
- Kubernetes Services, Endpoints, NetworkPolicy, and DNS
- kubectl
- Argo CD CLI
- Ingress controllers and load balancers: AWS ALB, ingress-nginx, Traefik
- Istio service mesh
- TLS configuration

## Sources Consulted
- Argo CD Architecture: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD argocd login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- gRPC Status Codes documentation: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The architecture diagram implied that the API server talks to the application controller over gRPC. Updated the diagram to show the key gRPC paths relevant to this error: CLI/UI to API server, and API server/application controller to repo server.
- The repo server TLS example said it disabled TLS while setting `reposerver.disable.tls: "false"`, and it used unsupported `reposerver.tls.cert` and `reposerver.tls.key` ConfigMap keys. Updated the example to use `reposerver.disable.tls: "true"` with the matching plaintext client settings, and noted that custom repo server certificates should be provided through the `argocd-repo-server-tls` Kubernetes TLS secret.
- The ingress examples mixed incompatible protocol/TLS modes. Updated nginx to use SSL passthrough consistently, updated Traefik to the current `traefik.io/v1alpha1` API and Argo CD's documented h2c route, and corrected the AWS ALB example to use a separate annotated gRPC service.
- The default port list incorrectly described `8083` as the API server gRPC port and `8082` as a controller service port. Updated the list to distinguish the Argo CD server service ports from metrics ports and the repo server API port.

## Review Notes
The troubleshooting flow is technically sound after the corrections. Some examples are intentionally abbreviated and may need environment-specific additions such as complete ALB Ingress rules, namespace labels for DNS NetworkPolicy restrictions, or Helm value equivalents.
