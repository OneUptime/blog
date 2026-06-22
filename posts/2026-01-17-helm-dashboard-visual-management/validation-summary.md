# Validation Summary: How to Use Helm Dashboard for Visual Release Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm Dashboard
- Helm
- Kubernetes
- Docker
- Kubernetes RBAC
- Kubernetes Ingress
- OAuth2 Proxy
- Kubeapps
- Rancher

## Sources Consulted
- Helm Dashboard official README: https://github.com/komodorio/helm-dashboard
- Helm Dashboard features overview: https://github.com/komodorio/helm-dashboard/blob/main/FEATURES.md
- Helm Dashboard Dockerfile: https://github.com/komodorio/helm-dashboard/blob/main/Dockerfile
- Helm Dashboard source flags in `main.go`: https://github.com/komodorio/helm-dashboard/blob/main/main.go
- Helm Dashboard official Helm chart README and values: https://github.com/komodorio/helm-dashboard/tree/main/charts/helm-dashboard
- Komodor Helm charts repository: https://github.com/komodorio/helm-charts
- Helm command source for repository and list behavior: https://github.com/helm/helm
- Kubeapps project status: https://github.com/vmware-tanzu/kubeapps
- SAP-maintained Kubeapps fork: https://github.com/SAP/kubeapps
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- OAuth2 Proxy documentation: https://oauth2-proxy.github.io/oauth2-proxy/

## Issues Found
- The post described the Helm plugin as the recommended installation method. Upstream Helm Dashboard documentation says the standalone binary is recommended since version 1.0, so a standalone binary section was added and the plugin section was made secondary.
- The architecture diagram implied Helm Dashboard always calls the Helm CLI. Current Helm Dashboard can run without Helm or kubectl installed, so the diagram was changed to refer to the Dashboard backend and to show chart repositories as backend-managed rather than Kubernetes API objects.
- The plugin example used `helm dashboard --kubeconfig`, which is not a Helm Dashboard flag. It was changed to use the standard `KUBECONFIG` environment variable.
- The Docker examples mounted `~/.helm`, which is not the Helm 3 default configuration layout and is not required by the official container entrypoint. That mount was removed.
- The Docker and Kubernetes read-only examples used unsupported `HELM_DASHBOARD_READONLY` environment variables. The Docker example was narrowed to a read-only kubeconfig mount, and Kubernetes read-only guidance was changed to use read-only RBAC or the chart's `dashboard.allowWriteActions=false` value.
- The Kubernetes deployment example used unsupported `HELM_DASHBOARD_DEBUG`; current source uses `DEBUG` for environment-driven verbose logging and CLI args such as `--no-browser` and `--bind`.
- The configuration snippet listed unsupported `HELM_DASHBOARD_*` environment variables. It was updated to use `HD_BIND`, `DEBUG`, `HELM_NAMESPACE`, `KUBECONFIG`, and command-line flags for port and browser behavior.
- The Helm chart section did not mention the chart-supported read-only control. Added `--set dashboard.allowWriteActions=false`.
- The troubleshooting command used `helm dashboard --debug`, which is not a valid current flag. It was changed to `helm dashboard --verbose`.
- The comparison table referred to Kubeapps without noting the original VMware Tanzu project is deprecated and archived. The table was updated to refer to the maintained SAP fork.

## Review Notes
The post is technically valid after fixes. The manually written Kubernetes deployment and RBAC examples are illustrative; for production use, the official Helm chart is preferable because it sets the container command, args, service account, service, persistence, and RBAC consistently with the current chart values.
