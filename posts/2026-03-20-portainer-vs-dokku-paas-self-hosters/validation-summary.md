# Validation Summary: Portainer vs Dokku: PaaS Comparison for Self-Hosters - Paas Self Hosters

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- Dokku
- Docker
- Docker Compose
- Git-based deployment
- Buildpacks
- Kubernetes
- k3s

## Sources Consulted
- Portainer documentation overview: https://docs.portainer.io/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer stack webhook documentation: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer FAQ on building images from Git-based stack deployments: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Portainer roles / RBAC documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer environment management documentation: https://docs.portainer.io/admin/environments/add
- Portainer architecture FAQ: https://docs.portainer.io/faqs/getting-started/what-is-portainers-architecture
- Dokku getting started documentation: https://dokku.com/docs/getting-started/installation/
- Dokku application deployment documentation: https://dokku.com/docs/deployment/application-deployment/
- Dokku process management documentation: https://dokku.com/docs/processes/process-management/
- Dokku domain configuration documentation: https://dokku.com/docs/configuration/domains/
- Dokku k3s scheduler documentation: https://dokku.com/docs/deployment/schedulers/k3s/
- Dokku plugin management documentation: https://dokku.com/docs/advanced-usage/plugin-management/
- Dokku architecture documentation: https://dokku.com/docs/development/architecture/

## Issues Found
- The post described Portainer as a `git push` deployment option "via webhooks". I corrected this to reflect Portainer's documented behavior: Portainer can deploy Compose stacks from a Git repository and can trigger updates via webhooks, but it does not provide Dokku-style native `git push` deployment.
- The Portainer deployment section was too narrow and slightly misleading. I updated it to mention UI/API deployment plus Git-repository-backed Compose deployment, which Portainer documents explicitly.
- The feature table understated Dokku's current scheduler capabilities. I corrected the `Multi-host` and `Kubernetes` rows to note Dokku's official `k3s` scheduler support.
- The `Docker Compose` row for Dokku said `Partial`, which is not supported by current Dokku deployment docs. I changed this to `No native support`.
- The `Auto-build from source` row was too absolute for Portainer and too narrow for Dokku. I changed Portainer to `Limited` based on Portainer's own FAQ about Git-based stack deploy limitations, and changed Dokku to `Yes (Buildpacks/Dockerfile)` to match the documented builders.
- The Dokku process-scaling example in the feature table was syntactically incomplete because it omitted the app name. I corrected it to `dokku ps:scale myapp web=3`.
- The SSL row for Dokku was too broad. I clarified it to `Via Let's Encrypt plugin`, which matches the current application deployment documentation.
- The Portainer strengths section implied RBAC as a general Portainer feature. I qualified this to `Business Edition`, matching Portainer's product and roles documentation.
- The opening comparison text oversimplified Portainer as Docker-only and implied both tools were simply "Docker under the hood". I corrected that wording to avoid mischaracterizing Portainer's broader documented scope.

## Review Notes
- Dokku's getting-started guide still frames the default experience around a single server, but the current official docs also include first-party `k3s` scheduler support for Kubernetes and multi-server operation.
- Portainer stack webhooks are documented as a Business Edition feature, and Portainer's Git-based stack deployment is documented as not fully featured for Compose-driven image builds from repository contents.
