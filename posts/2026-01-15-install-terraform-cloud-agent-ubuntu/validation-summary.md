# Validation Summary: How to Install and Use Terraform Cloud Agent on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation and operations walkthrough)

## Technologies Covered
- Terraform Cloud / HCP Terraform Agents (`tfc-agent`)
- Terraform CLI
- Ubuntu (apt, systemd)
- Docker and Docker Compose
- HashiCorp `tfe` Terraform provider
- HashiCorp Vault / AWS Secrets Manager (token storage)

## Sources Consulted
- Install and run HCP Terraform agents — https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HCP Terraform agent requirements — https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- tfc-agent releases — https://releases.hashicorp.com/tfc-agent/
- HashiCorp Help Center: How to add AWS, GCP, and Azure CLI to your custom tfc-agent image — https://support.hashicorp.com/hc/en-us/articles/21338065335187
- HashiCorp Help Center: How to run tfc-agent binary as a Service with systemd — https://support.hashicorp.com/hc/en-us/articles/14383778881043
- hashicorp/tfc-agent Docker image — https://hub.docker.com/r/hashicorp/tfc-agent
- HashiCorp blog: HCP Terraform enhanced Free tier (agents available across tiers) — https://www.hashicorp.com/en/blog/terraform-cloud-updates-plans-with-an-enhanced-free-tier-and-more-flexibility

## Issues Found

1. **Incorrect APT install method (Method 2).** The post claimed `tfc-agent` could be installed with `sudo apt-get install -y tfc-agent` from the HashiCorp APT repository and would land at `/usr/bin/tfc-agent`. HashiCorp does **not** distribute `tfc-agent` through the APT repository — it is only available as a binary download from `releases.hashicorp.com`, as the `hashicorp/tfc-agent` Docker image, and via the HCP Terraform Operator for Kubernetes. Rewrote the section ("Method 2: Docker Image or Kubernetes Operator") to state the agent is not in the APT repo and to point to the Docker image (with a `docker run --rm ... --version` example) and Kubernetes operator as the supported alternatives.

2. **Wrong package manager in the custom Dockerfile.** The custom-image example used `apk add --no-cache` with Alpine package names (`aws-cli`, `py3-pip`). The official `hashicorp/tfc-agent` image is Debian/Ubuntu-based (glibc), so `apk` does not exist. Changed to `apt-get update && apt-get install -y --no-install-recommends` with Debian package names (`awscli`, `python3-pip`) plus a cleanup of `/var/lib/apt/lists/*`. Also added `--break-system-packages` to the `pip3 install` line, which is required on PEP 668 (externally-managed) Python environments on current Debian/Ubuntu bases.

3. **Outdated pricing-tier prerequisite.** The post stated a "Business or Enterprise tier" account is required for self-hosted agents. The "Business" tier no longer exists, and HCP Terraform now makes cloud agents available across tiers (the Free tier includes a limited number of agents). Updated the prerequisite to reflect current availability across HCP Terraform tiers and Terraform Enterprise.

4. **Non-functional second systemd agent.** In the "Multiple systemd Services" section, the second `sed` command was a no-op (`s/tfc-agent-02/tfc-agent-02/g`), leaving the copied service unit with `ReadWritePaths=/var/lib/tfc-agent`. Because the unit uses `ProtectSystem=strict`, the second agent (configured with `TFC_AGENT_DATA_DIR=/var/lib/tfc-agent-02`) would be denied write access to its own data directory and fail. Replaced the no-op with a `sed` that updates `ReadWritePaths` to `/var/lib/tfc-agent-02`.

## Review Notes
- The core architecture description (outbound-only HTTPS, agent poll model, no inbound firewall rules), the binary install via `releases.hashicorp.com/tfc-agent/` (two binaries `tfc-agent` and `tfc-agent-core` in the same directory), the environment variables (`TFC_AGENT_TOKEN`, `TFC_AGENT_NAME`, `TFC_AGENT_LOG_LEVEL`, `TFC_AGENT_DATA_DIR`, `TFC_AGENT_AUTO_UPDATE=disabled`), the systemd hardening directives, and the `tfe` provider workspace/agent-pool configuration are all accurate.
- `TFC_AGENT_VERSION="1.15.0"` is an illustrative pinned version; readers are correctly directed to check the releases page for the latest. No change needed, but it will age over time.
- The Docker Compose v2 `deploy.resources` limits are honored by `docker compose` but ignored by Swarm-less plain Docker in some older setups; this is a minor caveat, not an error.
- The `terraform_version = "1.6.0"` in the `tfe_workspace` example is a valid but older Terraform version; readers may wish to bump it. Left as-is since it is functionally correct.
