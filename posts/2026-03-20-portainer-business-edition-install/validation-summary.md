# Validation Summary: How to Install Portainer Business Edition - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker
- Docker Swarm
- Kubernetes
- Helm
- LDAP
- Active Directory

## Sources Consulted
- Portainer Docker standalone install docs: https://docs.portainer.io/start/install/server/docker/linux
- Portainer Docker Swarm install docs: https://docs.portainer.io/start/install/server/swarm/linux
- Portainer Kubernetes install docs: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Portainer initial setup docs: https://docs.portainer.io/start/install/server/setup
- Portainer license CLI FAQ: https://docs.portainer.io/faqs/licensing/is-there-a-way-to-specify-the-license-at-the-command-line
- Portainer license administration docs: https://docs.portainer.io/admin/licenses
- Portainer pricing FAQ: https://docs.portainer.io/faqs/licensing/what-is-the-pricing-for-business-edition
- Portainer LDAP authentication docs: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer Active Directory authentication docs: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer team management docs: https://docs.portainer.io/admin/user/teams/add
- Portainer general settings and backup docs: https://docs.portainer.io/admin/settings/general
- Portainer feature overview: https://www.portainer.io/features

## Issues Found
- The Docker install examples used the rolling `:latest` tag. I updated them to the current Portainer LTS tag `portainer/portainer-ee:lts` to match official installation guidance.
- The Docker Swarm example used a direct `docker service create` deployment. Current Portainer docs deploy Swarm using the official `portainer-agent-stack.yml` stack so the Portainer Agent is installed across the swarm. I replaced the snippet with the documented stack deployment commands.
- The Kubernetes YAML manifest URL was outdated (`ee2-20/portainer.yaml`). I updated it to the current LTS manifest URL and clarified that this manifest is the default NodePort deployment.
- The Helm example was missing the current LTS image tag setting. I updated it to the current documented install form using `helm upgrade --install`, `--create-namespace`, and `--set enterpriseEdition.image.tag=lts`.
- The license activation example used an unsupported `--license-key` flag. Portainer currently documents license injection via the `PORTAINER_LICENSE_KEY` environment variable, so I corrected the command.
- The web UI activation step hardcoded `https://your-server:9443`, which is not correct for the default Kubernetes NodePort manifest. I changed it to describe deployment-specific access URLs.
- The pricing and feature comparison table was outdated. The old plan names and per-plan feature differences did not match current Portainer pricing. I updated the section to the current Starter, Scale, and Enterprise plans and reflected that all current Business Edition plans include the same BE feature set.
- The LDAP/AD section mixed LDAP and Active Directory settings and used fields that do not correspond to the current Portainer UI. I rewrote the examples to match the current LDAP and AD configuration pages.
- The Teams section used the wrong UI path (`Settings → Teams`). I corrected it to `User-related → Teams` and removed unsupported claims about direct AD group mapping from that screen.
- The backup section used the wrong UI path and listed unsupported destinations and options such as Azure Blob storage and retention counts. I corrected it to the current `Back up Portainer` workflow, which supports local download and S3-compatible storage with optional scheduling and password protection.
- The overview and conclusion overstated some BE-only differences, particularly around LDAP and multi-environment management. I narrowed those claims to features that are clearly documented as Business Edition differentiators.

## Review Notes
- The post is now aligned to Portainer’s current LTS installation guidance as of 2026-04-24.
- Pricing and plan details are time-sensitive and should be revalidated if this post remains unchanged for a long period.
- The default Kubernetes YAML manifest installs Portainer behind a NodePort service, while the Helm example in the post exposes Portainer through a LoadBalancer service. Both are valid, but they produce different access URLs.
