# Validation Summary: How to Set ArgoCD Server to Run on a Custom Port

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Kubernetes Services
- Kubernetes Deployments
- Kubernetes Ingress
- ingress-nginx TCP services
- NodePort and LoadBalancer service exposure
- Prometheus ServiceMonitor

## Sources Consulted
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD Ingress configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD upstream stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD `argocd-cmd-params-cm.yaml` example: https://raw.githubusercontent.com/argoproj/argo-cd/stable/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD server source for port flags and defaults: https://raw.githubusercontent.com/argoproj/argo-cd/stable/cmd/argocd-server/commands/argocd_server.go
- Argo CD common default ports: https://raw.githubusercontent.com/argoproj/argo-cd/stable/common/common.go
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- ingress-nginx TCP/UDP services documentation: https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/exposing-tcp-udp-services.md
- ingress-nginx annotations documentation: https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md

## Issues Found
- The post said the Argo CD server listens on port 8083 for "gRPC metrics." Changed this to say port 8080 handles HTTP/HTTPS and gRPC API traffic, while port 8083 is the metrics endpoint.
- The Service JSON patch assumed the default `argocd-server` Service has `https` at `/spec/ports/0` and `http` at `/spec/ports/1`. Current upstream manifests list `http` first and `https` second, so the patch was corrected.
- The container port patch attempted to replace `/spec/template/spec/containers/0/command`, but current upstream manifests use `args` with `/usr/local/bin/argocd-server`. Changed the patch to update `args`.
- The container port patch did not update the liveness and readiness probe ports. Added probe updates so changing the server listen port does not make the Deployment fail health checks.
- The `argocd-cmd-params-cm` section used unsupported `server.port` and `server.metrics.port` keys. Current upstream manifests do not map those keys from the ConfigMap, and the command source does not read `ARGOCD_SERVER_PORT` or `ARGOCD_SERVER_METRICS_PORT`. Replaced that example with a Deployment args patch using `--port` and `--metrics-port`.
- The insecure-mode example used `server.port` in `argocd-cmd-params-cm`. Kept `server.insecure`, which is supported, and added a Deployment args patch for the custom port.

## Review Notes
The examples assume the upstream Argo CD stable manifests. Helm chart deployments may expose equivalent settings through chart values, so operators using Helm should prefer chart values over direct `kubectl patch` commands.
