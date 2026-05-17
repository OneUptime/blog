# Validation Summary: How to Use Terraform Cloud with Ubuntu Self-Hosted Agents

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform / Terraform Cloud
- tfc-agent (self-hosted agent)
- Ubuntu 20.04 / 22.04
- systemd (service and template units)
- HashiCorp releases (`releases.hashicorp.com`)
- Terraform Registry (`registry.terraform.io`)
- Terraform providers (AWS, vSphere, Kubernetes, Helm)
- Snap, apt-get for package installation

## Sources Consulted
- HCP Terraform Agents overview: https://developer.hashicorp.com/terraform/cloud-docs/agents
- HCP Terraform Agent Configuration (env vars and CLI flags): https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HCP Terraform Agent Requirements: https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HCP Terraform Agent Pools: https://developer.hashicorp.com/terraform/cloud-docs/agents/agent-pools
- HCP Terraform API docs: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- HashiCorp Terraform pricing page: https://www.hashicorp.com/products/terraform/pricing
- HashiCorp releases for tfc-agent: https://releases.hashicorp.com/tfc-agent/

## Issues Found
1. **Incorrect description for `TFC_AGENT_AUTO_UPDATE`.** The original comment said it "automatically re-register[s] if token changes". This is wrong — per HashiCorp docs, the variable controls automatic updates of the agent binary (valid values: `disabled`, `patch`, `minor`; default: `minor`). Updated the comment to describe the actual behavior and document valid values.
2. **Incorrect description for `TFC_AGENT_SINGLE`.** The original comment said it limits "concurrent jobs (default is 1)". This is wrong — `TFC_AGENT_SINGLE` causes the agent to execute a single workload and then exit (used for ephemeral agents); it does not control concurrency. Updated the comment to reflect the documented behavior.
3. **Outdated tier requirement.** The post stated "Business tier or higher". HashiCorp renamed Terraform Cloud to HCP Terraform and replaced the Business tier with the Plus edition. Updated to "HCP Terraform Plus edition (or Terraform Enterprise)".
4. **Non-existent API endpoint.** The post referenced `https://app.terraform.io/api/v2/ping` and claimed it returns `{"status":"ok"}`. There is no documented public `/api/v2/ping` endpoint — `/api/v2` endpoints all require bearer-token authentication. Replaced the curl examples with a request to `https://app.terraform.io/` that verifies TLS reachability without depending on an undocumented endpoint or specific JSON response.
5. **`mkdir` without `-p` in the multi-agent section.** The previous step already created `/etc/tfc-agent`, so `sudo mkdir /etc/tfc-agent` would fail with "File exists". Changed to `mkdir -p`.

## Review Notes
- The agent download URL pattern (`https://releases.hashicorp.com/tfc-agent/${AGENT_VERSION}/tfc-agent_${AGENT_VERSION}_linux_amd64.zip`) is correct, as is the presence of both `tfc-agent` and `tfc-agent-core` binaries inside the zip.
- The pinned versions `1.15.0` / `1.16.0` exist on the releases page but are not the latest; readers should check the releases page for newer versions. Left as-is since the post is a tutorial and these versions still install and run.
- The "Running Multiple Agents" section presents two approaches (per-agent service files, then template units) somewhat awkwardly — the first attempt is left as a partial example before pivoting to the template approach. Technically the commands work, but readers may find it confusing. Not modified since it is a stylistic concern, not a technical error.
- `TFC_AGENT_AUTO_UPDATE` is enabled by default (`minor`), which means most agents will keep themselves updated automatically — worth noting if security teams want to pin a specific version.
- The networking requirements list omits `archivist.terraform.io` (used by HCP Terraform for object storage of plan/state artifacts). The listed endpoints are sufficient for most deployments, but strict allow-lists may need to add it. Left as-is since it is an addition, not a correction.
- The agent log levels listed (`info`, `debug`, `trace`) are valid; `warn` and `error` are also valid but typically less useful for troubleshooting. Not modified.
