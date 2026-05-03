# Validation Summary: How to Deploy Helm Charts in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes environment management UI)
- Kubernetes
- Helm (package manager for Kubernetes)
- Helm Charts (Bitnami nginx, Prometheus, Grafana, NGINX repos)
- YAML configuration / values overrides

## Sources Consulted
- Helm official documentation: https://helm.sh/docs/
- Helm CLI reference: https://helm.sh/docs/helm/helm_install/, https://helm.sh/docs/helm/helm_repo_add/, https://helm.sh/docs/helm/helm_search_repo/
- Portainer Helm integration documentation: https://docs.portainer.io/user/kubernetes/helm
- Bitnami Helm charts: https://github.com/bitnami/charts (chart values for nginx)
- Prometheus Community Helm charts: https://prometheus-community.github.io/helm-charts
- Grafana Helm charts: https://grafana.github.io/helm-charts
- NGINX Helm charts: https://helm.nginx.com/stable

## Issues Found
No technical issues found.

- The description of Helm as "the package manager for Kubernetes" matches the official tagline.
- All Helm CLI commands (`helm repo add`, `helm repo update`, `helm search repo`, `helm install` with `--namespace`, `--create-namespace`, `--set`, and `-f` flags) are syntactically correct and current.
- The example YAML overrides (`replicaCount`, `service.type`, `service.port`, `resources`, `autoscaling`) are valid keys for the Bitnami nginx chart.
- The four listed Helm repository URLs all resolve to the correct, active Helm repositories.
- The Portainer UI navigation steps (Applications > Helm charts, Settings > Helm, Install/Upgrade flow) align with Portainer's documented Helm integration.

## Review Notes
- Portainer UI menu paths can shift slightly across versions (e.g., the Helm tab can appear under different parents depending on the Portainer Business Edition vs Community Edition release). The post hedges this with "(or **Helm** in the sidebar)" which is appropriate.
- As of August 2025, Bitnami restructured its public catalog (Bitnami Secure Images / "Bitnami Legacy") which changed availability of some container images. The Helm chart repository at `charts.bitnami.com/bitnami` still functions, but readers may want to consult Bitnami's current advisories if they hit unexpected image-pull behavior. This is a deployment-time caveat rather than a correctness issue with the post.
- The "without downtime" claim under "Upgrading a Deployed Chart" depends on the chart's deployment strategy (rolling update is the default for the Deployment workload type used by these charts), so it is generally accurate for the charts referenced.
