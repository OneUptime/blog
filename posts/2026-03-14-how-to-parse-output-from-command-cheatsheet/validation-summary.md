# Validation Summary: How to Parse Output from Command Cheatsheet

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Cilium Health CLI (`cilium-health`)
- Kubernetes
- jq
- Bash
- Helm
- Prometheus / Grafana

## Sources Consulted
- Cilium command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-dbg service list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium API reference for endpoint, service, and status JSON field names: https://docs.cilium.io/en/stable/api.html

## Issues Found
- The post used `cilium endpoint list`, `cilium identity list`, `cilium service list`, `cilium metrics list`, `cilium policy get`, and `cilium config view` for agent-level operations. Current Cilium documentation exposes these as `cilium-dbg` agent debug commands, while the standalone `cilium` CLI is for Kubernetes installation, status, connectivity testing, and sysdump workflows. Updated the affected commands to `cilium-dbg` or Kubernetes resource inspection commands as appropriate.
- The service parsing example used non-existent underscore JSON fields, `.spec.frontend_address` and `.spec.backend_addresses`. The Cilium API schema uses hyphenated fields and realized backend data under `.status.realized["backend-addresses"]`. Updated the jq expression to use `.spec["frontend-address"]` and `.status.realized["backend-addresses"]`.
- The status parsing script used `.cluster_mesh.state`, but the Cilium API status model uses the JSON key `cluster-mesh`. Updated the jq expression to `."cluster-mesh".state`.
- The verification section used `cilium health status`, which is not the documented health CLI command. Updated it to `cilium-health status`.
- The prerequisites only mentioned the standalone `cilium` CLI, but most parsing examples require access to `cilium-dbg` on a Cilium agent pod or node. Added that prerequisite.

## Review Notes
The post is technically relevant and contains executable CLI, Bash, and jq examples. Some examples are necessarily environment-dependent because `cilium-dbg` usually runs on or against a Cilium agent API, while `cilium status`, `cilium connectivity test`, and `cilium sysdump` are cluster-management commands from the standalone Cilium CLI.
