# Validation Summary: How to Configure Terraform Enterprise Custom Agents

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform / Terraform Enterprise agents
- Terraform Enterprise API
- Docker
- Docker Compose
- Kubernetes
- KEDA

## Sources Consulted
- HashiCorp Developer: Install and run HCP Terraform agents - https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agent requirements - https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HashiCorp Developer: Manage HCP Terraform agent pools - https://developer.hashicorp.com/terraform/cloud-docs/agents/agent-pools
- HashiCorp Developer: Terraform Enterprise agents and agent pools API reference - https://developer.hashicorp.com/terraform/enterprise/api-docs/agents
- HashiCorp Developer: Terraform Enterprise agent token API reference - https://developer.hashicorp.com/terraform/enterprise/api-docs/agent-tokens
- HashiCorp Developer: Terraform Enterprise workspaces API reference - https://developer.hashicorp.com/terraform/enterprise/api-docs/workspaces
- HashiCorp Help Center: Configure HCP Terraform Agent with Proxy and Custom CA Certificate - https://support.hashicorp.com/hc/en-us/articles/49681731286803-How-to-Configure-HCP-Terraform-Agent-with-Proxy-and-Custom-CA-Certificate
- KEDA documentation: Metrics API scaler - https://keda.sh/docs/2.14/scalers/metrics-api/

## Issues Found
- The prerequisites only mentioned outbound HTTPS access to TFE. HashiCorp's agent requirements also call out access to services required by the run, including provider APIs and Terraform release distribution unless internally mirrored. Updated the prerequisite to include those dependencies.
- The Docker Compose and troubleshooting examples used `TFC_AGENT_CUSTOM_CA_CERT_FILE`, which is not the documented custom CA pattern for the agent container. Updated the examples to use `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE` with the mounted certificate path.
- The Kubernetes deployment referenced `serviceAccountName: tfe-agent` without creating that ServiceAccount, so the manifest would fail in clusters where the ServiceAccount did not already exist. Added the ServiceAccount resource to the manifest.
- The KEDA example queried the Terraform Enterprise agent-pool endpoint and used `agent-count` as if it represented queued work. That endpoint reports connected agents, not backlog, and the example also omitted the bearer authentication configuration required by KEDA's Metrics API scaler for authenticated endpoints. Updated the example to use an authenticated internal metrics endpoint that exposes `queued_runs`.

## Review Notes
The remaining API endpoints, JSON API payload shapes, agent token creation flow, Docker agent environment variables, workspace `execution-mode` and `agent-pool-id` settings, and agent listing endpoint match HashiCorp's current documentation. Production deployments should still pin tested agent image versions instead of relying on `latest`, but `latest` remains valid for a general tutorial example.
