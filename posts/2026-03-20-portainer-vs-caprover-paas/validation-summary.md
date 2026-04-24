# Validation Summary: Portainer vs Caprover: PaaS Comparison - Paas

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- CapRover
- Docker
- Docker Swarm
- Docker Compose
- Kubernetes
- Let's Encrypt

## Sources Consulted
- CapRover Getting Started: https://caprover.com/docs/get-started
- CapRover CLI Commands: https://caprover.com/docs/cli-commands.html
- CapRover Captain Definition File: https://caprover.com/docs/captain-definition-file.html
- CapRover App Configuration: https://caprover.com/docs/app-configuration.html
- CapRover App Scaling & Cluster: https://caprover.com/docs/app-scaling-and-cluster.html
- CapRover One-Click Apps: https://caprover.com/docs/one-click-apps
- Portainer Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer App templates: https://docs.portainer.io/advanced/app-templates
- Portainer Stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer Using your own SSL certificate: https://docs.portainer.io/advanced/ssl
- Portainer Kubernetes applications: https://docs.portainer.io/user/kubernetes/applications
- Portainer Edge Compute: https://docs.portainer.io/user/edge
- Portainer FAQ on Git deployment image builds: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The comparison table said Portainer Git deployment was "via webhooks". Portainer officially supports deploying stacks directly from a Git repository, while webhooks are an update mechanism and Portainer documents limitations around building images from repository files. I corrected this to partial Git repository deployment.
- The table said Portainer had no automatic HTTPS and no custom domains. Portainer does support HTTPS for its own UI/API, but app-level domain and TLS handling is manual rather than built-in PaaS automation. I changed those rows to "Manual" and clarified that the rows refer to app-level behavior.
- The table described Portainer CLI support as "Via API". An HTTP API is not the same thing as a first-party CLI, so I corrected this to "No first-party CLI".
- The CapRover command block omitted documented installation requirements for `docker run`, including `-e ACCEPTED_TERMS=true` and the `/captain` volume, and it showed login/deploy commands before server installation and setup. I reordered and corrected the commands to match CapRover's documented flow.
- The post used "git-push" wording for CapRover's developer workflow. CapRover's official docs center on CLI/CI deployment and one-click apps, so I narrowed that bullet to CLI- or one-click deployments.
- Product naming and one Swarm description were normalized for accuracy: "Caprover" was corrected to "CapRover", and the Portainer section now says Portainer exposes Swarm primitives rather than providing them.

## Review Notes
- This is a valid comparison, but the tools are not exact peers: CapRover is a self-hosted PaaS built on Docker Swarm, while Portainer is a broader container-management platform for Docker, Swarm, Kubernetes, and Edge environments.
- Portainer's Git-based deployment support is real, but its own FAQ notes that build-from-repository support is not fully implemented. Readers should not interpret it as a Heroku-style source-build workflow.
- The Docker Compose snippet in the Portainer section is syntactically valid for Swarm-oriented deployments and uses fields documented in Docker's Compose Deploy Specification.
