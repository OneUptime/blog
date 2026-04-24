# Validation Summary: How Portainer Nomad Support Worked (Removed in 2.20)

## Status
validated

## Post Type
Historical reference

## Technologies Covered
- Portainer
- HashiCorp Nomad
- Portainer Edge Agent
- Portainer Edge Stacks / Edge Compute
- Nomad job specifications (HCL)

## Sources Consulted
- Portainer 2.19 release notes (official docs source): https://raw.githubusercontent.com/portainer/portainer-docs/2.19/release-notes.md
- Portainer 2.21 release notes (official docs source, includes 2.20.0 notes): https://raw.githubusercontent.com/portainer/portainer-docs/2.21/release-notes.md
- Portainer 2.19 Nomad environment setup docs: https://raw.githubusercontent.com/portainer/portainer-docs/2.19/admin/environments/add/nomad.md
- Portainer 2.19 Nomad user docs: https://raw.githubusercontent.com/portainer/portainer-docs/2.19/user/nomad/jobs.md
- Portainer current Nomad deprecation notice: https://docs.portainer.io/user/nomad
- Portainer known issue for Nomad jobs: https://docs.portainer.io/faqs/known-issues/nomad-jobs-only-displays-service-jobs
- Portainer deprecated and removed features: https://docs.portainer.io/2.21/advanced/deprecated
- Nomad job specification reference: https://developer.hashicorp.com/nomad/docs/job-specification
- Nomad Web UI reference: https://developer.hashicorp.com/nomad/api-docs/ui
- Levant tutorial in official Nomad docs: https://developer.hashicorp.com/nomad/tutorials/templates/dry-jobs-levant
- Nomad Pack official docs: https://developer.hashicorp.com/nomad/tools/nomad-pack

## Issues Found
- The post said Portainer Nomad support was introduced in `2.17`. Portainer's official release notes show Nomad integration was introduced in `2.12.2`, received a deprecation notice in `2.19.5`, and was removed in `2.20.0`. I corrected the timeline.
- The post described Nomad environments as being connected by providing a Nomad API endpoint and ACL token. Portainer's official Nomad setup flow used the Portainer Edge Agent, with Portainer server URL / tunnel settings and optional Nomad ACL authentication. I corrected the connection workflow.
- The post said Portainer let users submit HCL jobs directly from within Portainer. Portainer's official docs describe Nomad deployments via Edge Stacks / Edge Compute, which Portainer deployed as Nomad jobs. I corrected that description and softened the sample jobspec caption so it no longer implies a direct HCL submission UI.
- The post attributed removal significantly to HashiCorp's BSL change. Portainer's public deprecation/removal notices cite limited adoption and development cost, not licensing. I replaced the unsupported causation with Portainer's documented reasons.
- The post recommended Waypoint as a current Nomad-management alternative. That recommendation is not a good fit for the current Nomad toolchain. I replaced it with Nomad Pack, which is currently documented by HashiCorp as a Nomad packaging and templating tool.
- The post broadly described feature parity without noting a documented limitation. Portainer officially documents that affected versions `2.14.0` through `2.19.4` only displayed Service jobs in the UI because System, Batch, and Sysbatch jobs could break it. I added this limitation to keep the historical summary accurate.

## Review Notes
- The Nomad HCL snippet is syntactically consistent with the current Nomad job specification reference.
- Portainer's current documentation no longer documents Nomad workflows beyond deprecation/removal notices, so archived 2.19 docs and release notes were necessary to validate the historical behavior described in the post.
