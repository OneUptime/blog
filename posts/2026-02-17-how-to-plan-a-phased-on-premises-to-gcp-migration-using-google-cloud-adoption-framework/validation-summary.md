# Validation Summary: How to Plan a Phased On-Premises to GCP Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Adoption Framework
- Google Cloud Migration Center
- Migration Center discovery client CLI (`mcdc`)
- Migrate to Virtual Machines
- Migrate to Containers CLI (`m2c`)
- Google Cloud Resource Manager
- Shared VPC and VPC networking
- Cloud VPN / HA VPN
- Workforce Identity Federation
- Organization Policy
- Cloud Monitoring uptime checks and alerting policies

## Sources Consulted
- Google Cloud Architecture Center: Migrate to Google Cloud: Get started - https://docs.cloud.google.com/architecture/migration-to-gcp-getting-started
- Google Cloud Architecture Center: Assess and discover your workloads - https://docs.cloud.google.com/architecture/migration-to-gcp-assessing-and-discovering-your-workloads
- Google Cloud Architecture Center: Plan and build your foundation - https://docs.cloud.google.com/architecture/migration-to-google-cloud-building-your-foundation
- Migration Center discovery client CLI overview - https://docs.cloud.google.com/migration-center/docs/discovery-client-cli-overview
- Download Migration Center discovery client CLI - https://docs.cloud.google.com/migration-center/docs/download-collector-cli
- Run a guest discovery - https://docs.cloud.google.com/migration-center/docs/run-guest-discovery
- Migrate to Virtual Machines: VM migration process - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/discover/lifecycle
- Migrate to Containers overview - https://docs.cloud.google.com/migrate/containers/docs/getting-started
- Migrate to Containers CLI reference for Linux - https://docs.cloud.google.com/migrate/containers/docs/m2c-cli-reference-linux
- Cloud Monitoring metrics scopes overview - https://docs.cloud.google.com/monitoring/settings
- `gcloud monitoring uptime create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- `gcloud monitoring policies create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- `gcloud resource-manager folders create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/folders/create
- `gcloud projects create` reference - https://cloud.google.com/sdk/gcloud/reference/projects/create
- `gcloud compute networks create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/create
- `gcloud compute networks subnets create` reference - https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud compute shared-vpc` reference - https://docs.cloud.google.com/sdk/gcloud/reference/compute/shared-vpc
- `gcloud iam workforce-pools create` reference - https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create
- `gcloud resource-manager org-policies set-policy` reference - https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy

## Issues Found
- The post described the Google Cloud migration path as three phases. Google Cloud's migration path includes Assess, Plan, Deploy, and Optimize, so I added Optimize and adjusted the transition sentence.
- The Migration Center discovery example used an obsolete-looking `mc-discovery-agent.sh` URL and described installing an agent on Linux servers. Current Migration Center docs use the `mcdc` discovery client CLI and guest collection scripts, so I replaced the commands with current `mcdc` download, SSH discovery, and local Linux collection examples.
- The HA VPN example implied that creating the VPN gateway alone establishes connectivity. I clarified that Cloud Router/BGP, peer gateway, and VPN tunnels are also required.
- The Migrate to Virtual Machines example used a non-existent `gcloud migration vms create` workflow for onboarding a source VM. I replaced it with the documented VM migration lifecycle: onboard, replicate, set target details, test-clone, cut over, and finalize.
- The Migrate to Containers example used the older `migctl migration create` syntax. Current docs use the `m2c` CLI, so I replaced it with `m2c copy ssh`, `m2c analyze`, and `m2c generate`.
- The Cloud Monitoring example used `gcloud monitoring workspaces create`, which is not part of the current `gcloud monitoring` command group. I replaced it with a note about automatic per-project metrics collection and metrics scopes.
- The uptime check command used the wrong command group and flags. I updated it to `gcloud monitoring uptime create` with current `--resource-type`, `--resource-labels`, `--path`, and `--period` usage.
- The alerting policy command lacked the required condition filter, duration, and threshold flags for a CLI-created condition. I added a complete example using `--condition-filter`, `--duration`, and `--if`.

## Review Notes
`gcloud` was not installed in the local workspace, so CLI validation was performed against official Google Cloud CLI reference documentation rather than local `--help` output. The timeline and wave planning examples are inherently organization-specific, but they are reasonable planning guidance rather than exact product behavior.
