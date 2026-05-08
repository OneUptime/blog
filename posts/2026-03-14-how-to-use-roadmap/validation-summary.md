# Validation Summary: Using the Cilium Roadmap for Planning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- GitHub Releases API
- Kubernetes
- Cilium community roadmap and release planning

## Sources Consulted
- Cilium Roadmap documentation: https://docs.cilium.io/en/latest/community/roadmap.html
- Cilium Community Meetings and Slack documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- GitHub REST API releases documentation: https://docs.github.com/rest/reference/releases
- GitHub API endpoint for Cilium latest release: https://api.github.com/repos/cilium/cilium/releases/latest

## Issues Found
- The upgrade-planning guidance implied roadmap items always have a target release. Cilium's roadmap documentation says the project does not give date commitments because work depends on the community. Updated the guidance to check whether a target release or active tracking issue exists.
- The feature readiness checklist did not mention the tentative nature of roadmap items. Added a check that reflects Cilium's no-date-commitment roadmap policy.
- The troubleshooting section pointed users to a `#community` Slack channel for meeting links. Official Cilium documentation says Zoom links are available in `#development` and in the meeting notes. Updated the channel reference.
- The troubleshooting section said all official times are in UTC. Official Cilium community meeting documentation lists the weekly meeting in US/Pacific and the APAC meeting in UTC. Updated the wording to say meeting times may be listed in different time zones.

## Review Notes
The `curl -s https://api.github.com/repos/cilium/cilium/releases/latest | jq -r '.tag_name'` command was tested locally and returned `v1.19.3` on 2026-05-08. The local environment does not have the `cilium` binary installed, so `cilium version` was verified against the official Cilium CLI command reference rather than local execution.
