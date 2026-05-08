# Validation Summary: Parsing Output from Cilium Agent Shell Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium and `cilium-dbg`
- Kubernetes and `kubectl exec`
- Shell scripting with `awk`, `sed`, `grep`, and `jq`
- Python 3 JSON parsing and subprocess execution
- Prometheus text exposition format

## Sources Consulted
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium API reference for endpoint list JSON fields: https://docs.cilium.io/en/stable/api/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus exposition formats documentation: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The table-output section said some commands only produce table output while using `cilium-dbg endpoint list`, which officially supports `-o json`. Changed the wording to describe parsing table-formatted text without implying that endpoint list lacks structured output.
- The table parsing examples did not account for the two-line endpoint-list header or multi-line label continuations. Updated the `awk` filters to skip non-endpoint lines and extract endpoint ID, ingress policy, egress policy, identity, and status.
- The status parser used `awk -F: '{print $2}'`, which truncates values containing additional colons such as URLs or nested status messages. Updated the extraction to preserve the rest of each matched status line.
- The controller-count extraction used `grep -P` and searched for lowercase `controllers`, but typical status output uses `Controller Status:`. Replaced it with an `awk` extraction against the documented status text shape.
- The health check looked for `Overall Health`, which is endpoint health output, not the normal daemon status summary. Updated it to check the `Cilium: Ok` daemon status line.
- The Python parser inferred whether policy was enabled by checking for realized L4 rules. Cilium documents `status.policy.realized.policy-enabled`, so the example now uses that field.

## Review Notes
The post correctly recommends JSON output where available. `cilium-dbg status` also supports `-o json`, so a future revision could prefer JSON parsing for status data as well, but the text parser remains valid for default command output.
