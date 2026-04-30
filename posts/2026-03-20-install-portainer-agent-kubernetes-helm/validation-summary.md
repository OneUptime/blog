# Validation Summary: How to Install Portainer Agent on Kubernetes via Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Portainer Agent
- Portainer Edge Agent

## Sources Consulted
- Portainer documentation: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer documentation: https://docs.portainer.io/admin/environments/add/kubernetes/edge
- Portainer docs source for the Kubernetes agent page: https://github.com/portainer/portainer-docs/blob/2.39/admin/environments/add/kubernetes/agent.md
- Portainer Helm chart documentation: https://portainer.github.io/k8s/charts/portainer/
- Portainer Kubernetes repository: https://github.com/portainer/k8s
- Kubernetes `kubectl logs` reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post claimed Portainer Agent on Kubernetes could be installed with a Helm chart named `portainer/portainer-agent`. The current official Portainer docs state that agent-only Helm charts are not available yet, and the official Helm repository currently documents only the `portainer/portainer` chart. I removed the invalid Helm install commands and replaced them with the Portainer-supported manifest workflow.
- The introduction said the Kubernetes Portainer Agent runs as a `DaemonSet`. Portainer’s current documentation shows the agent installation creates `deployment.apps/portainer-agent`. I corrected the post to describe the supported deployment accurately and updated the verification command accordingly.
- The prerequisites were incomplete and partially misleading. Portainer documents `kubectl` access, Cluster Admin rights, and matching `AGENT_SECRET` configuration when used on the server. I corrected the prerequisites to match the official requirements.
- The Edge Agent section used unsupported Helm values such as `env.edge.enable`, `env.edge.id`, and `env.edge.key`. I replaced this with the official Portainer flow: create the Kubernetes Edge Agent environment in Portainer, then run the generated deployment command. I also corrected the self-signed certificate guidance to reference `EDGE_INSECURE_POLL=1` through the Portainer UI setting.
- The configuration example used a Helm `values.yaml` for an agent-only chart that does not exist. I replaced it with the supported manifest-level `AGENT_SECRET` configuration that Portainer documents for Kubernetes agent deployments.
- The environment onboarding steps were inaccurate. Portainer’s current Kubernetes agent flow starts from the Kubernetes environment wizard, then requires an environment URL without a protocol and with the correct port for the selected exposure method. I corrected the steps and the port guidance to `9001` for LoadBalancer and `30778` for NodePort.

## Review Notes
As of April 30, 2026, Portainer documents the standard Kubernetes agent as a legacy option and recommends the Edge Agent for most use cases. The Helm repository and chart docs still do not provide an agent-only Helm chart, so any future reintroduction of Helm-specific instructions should be revalidated against Portainer’s official documentation first.
