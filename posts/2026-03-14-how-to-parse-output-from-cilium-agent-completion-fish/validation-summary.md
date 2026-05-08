# Validation Summary: How to Parse Output from cilium-agent completion fish

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium CLI
- cilium-dbg
- cilium-health
- Kubernetes
- jq
- Bash

## Sources Consulted
- Cilium command reference for `cilium-agent completion fish`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_completion_fish/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium command reference for `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-health status`: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium API reference for status, endpoint, and service JSON fields: https://docs.cilium.io/en/stable/api/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The post title, description, introduction, and conclusion incorrectly framed the guide as parsing `cilium-agent completion fish`. Official docs show that command only generates Fish shell completion script output. I corrected the post to describe parsing Cilium agent debug output instead.
- The examples used non-existent local-agent commands such as `cilium endpoint list`, `cilium identity list`, `cilium service list`, `cilium metrics list`, `cilium policy get`, and `cilium config view`. I changed these to the documented `cilium-dbg` equivalents.
- The service JSON example used underscore field names (`frontend_address`, `backend_addresses`), but Cilium's API uses hyphenated fields. I changed the `jq` filter to use `.spec["frontend-address"]` and `.spec["backend-addresses"]`.
- The status JSON script used incorrect top-level field names (`.cilium` and `.cluster_mesh`). I changed the filters to use the documented `."cilium-status"` object and hyphenated `cluster-mesh` key.
- The verification command used `cilium health status`, but the documented command is `cilium-health status`. I corrected the command.
- The troubleshooting section referenced `cilium bpf tunnel list`, which is not present in the current Cilium command reference. I replaced it with `cilium-dbg status --verbose` for routing and health details.
- The troubleshooting section said current Cilium requires kernel 4.19 or later. Current Cilium system requirements recommend Linux 5.10 or later, with documented distribution-equivalent exceptions. I updated the statement to point to the release-specific requirements and mention 5.10 for current releases.
- The init container log example hard-coded `cilium-init`, which is not a stable current init container name. I changed it to use `<init-container-name>`.

## Review Notes
The post now validates as a guide for parsing Cilium agent debug command output, not as a Fish shell-completion guide. The folder slug still contains `completion-fish`, but the post content has been corrected to avoid the technically incorrect command framing.
