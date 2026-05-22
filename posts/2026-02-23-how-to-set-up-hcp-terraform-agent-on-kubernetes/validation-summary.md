# Validation Summary: How to Set Up HCP Terraform Agent on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform agents
- HCP Terraform Operator for Kubernetes
- Terraform Cloud / HCP Terraform agent pools
- Kubernetes Deployments, Secrets, ServiceAccounts, NetworkPolicies, CronJobs, RBAC, and HorizontalPodAutoscaler
- Helm
- Docker
- AWS IRSA and cloud credentials
- OpenTelemetry

## Sources Consulted
- HashiCorp Developer: Install and run HCP Terraform agents: https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agent requirements: https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HashiCorp Developer: Manage agent pools with the HCP Terraform Operator v2: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-operator-v2-agentpool
- HashiCorp HCP Terraform Operator values: https://github.com/hashicorp/hcp-terraform-operator/blob/main/charts/hcp-terraform-operator/values.yaml
- HashiCorp HCP Terraform Operator API reference: https://github.com/hashicorp/hcp-terraform-operator/blob/main/docs/api-reference.md
- HashiCorp Helm chart repository index: https://helm.releases.hashicorp.com/index.yaml
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post referenced a non-existent `hashicorp/terraform-cloud-agent` Helm chart and used unsupported values such as `agent`, `existingSecret`, `agentConfig`, `extraEnv`, and `extraEnvFrom`. Replaced this section with the official HCP Terraform Operator Helm chart and an `AgentPool` custom resource, which is HashiCorp's documented Kubernetes management path for agents.
- The Kubernetes examples forced `runAsUser: 1000` and `fsGroup: 1000`, but the current `hashicorp/tfc-agent:latest` image runs as the `tfc-agent` user with UID/GID `999`. Updated the examples to use UID/GID `999`.
- The raw Deployment mounted `/agent-data` but did not configure the agent to use that directory. Added `TFC_AGENT_DATA_DIR=/agent-data`, matching the documented agent environment variable.
- The scheduled scaling CronJob used a ServiceAccount without the RBAC needed to update the Deployment scale subresource. Added the minimal ServiceAccount, Role, and RoleBinding.
- The monitoring section labeled a Kubernetes `Service` as a Prometheus `ServiceMonitor` and used an empty `ports` list for a non-metrics service. Removed the invalid manifest and replaced it with accurate guidance about `TFC_AGENT_OTLP_ADDRESS` and Kubernetes pod-level monitoring commands.
- The summary said to use Helm directly for a quick start, which was inaccurate after correcting the Helm method. Updated it to refer to the HCP Terraform Operator Helm chart.

## Review Notes
- The NetworkPolicy example is syntactically valid, but allowing `0.0.0.0/0` on TCP 443 permits HTTPS egress to any destination, not only HCP Terraform. In production, use a CNI or egress gateway that supports stricter DNS/FQDN or firewall-based controls if tighter filtering is required.
- The HPA example is valid for CPU-based scaling when Metrics Server or another resource metrics provider is installed. HCP Terraform Operator autoscaling may be a better fit when using operator-managed agent pools because it can scale based on pending HCP Terraform workloads.
