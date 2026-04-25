# Validation Summary: How to Install Portainer Agent on Kubernetes via Helm - A Practical Guide

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Kubernetes
- Helm
- Portainer API

## Sources Consulted
- Portainer Helm repository index: https://portainer.github.io/k8s/index.yaml
- Portainer Helm chart README: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/README.md
- Portainer documentation, "Install Portainer Agent on your Kubernetes environment": https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer CE Kubernetes Agent manifest: https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml
- Portainer source, endpoint creation handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_create.go

## Issues Found
- The post says the Portainer Agent Helm chart is the recommended way to deploy the agent and instructs readers to install `portainer/portainer-agent`. The official Portainer Helm repository currently publishes `portainer`, not `portainer-agent`, and Portainer's Kubernetes Agent documentation still points agent-only installations to YAML manifests. This makes the article's primary installation flow unsupported.
- The Helm examples use values such as `env.key`, `env.value`, `service.nodePort`, and `image.repository: portainer/agent` for an assumed `portainer-agent` chart. Because the official repo does not publish that chart, these configuration examples are not backed by a current official chart definition.
- The Portainer API example posts JSON with fields like `name`, `endpointCreationType`, and `type`. Portainer's current endpoint creation handler expects `multipart/form-data` fields such as `Name`, `EndpointCreationType`, and `URL`, so the example request would not work as written.
- No technical patch was applied to `README.md`. Fixing the post would require rewriting it into a different article based on Portainer's manifest-based Kubernetes Agent deployment or an Edge Agent workflow, not targeted corrections.

## Review Notes
- Portainer's current documentation describes Kubernetes Agent installation as a legacy option and recommends the Edge Agent for most use cases.
