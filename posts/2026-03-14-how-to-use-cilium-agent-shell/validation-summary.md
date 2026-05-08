# Validation Summary: Using the Cilium Agent Shell for Interactive Debugging

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Cilium
- Cilium agent shell
- Cilium StateDB
- cilium-dbg
- Kubernetes kubectl exec
- eBPF map inspection
- Bash scripting

## Sources Consulted
- Cilium command reference for `cilium-agent shell`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_shell/
- Cilium command reference for `cilium-dbg shell`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_shell/
- Cilium command reference for `cilium-dbg endpoint list` and related endpoint commands: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium command reference for `cilium-dbg policy`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy/
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf nat list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_nat_list/
- Cilium command cheatsheet for status, endpoint, policy, and BPF examples: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium v1.18.6 source for shell client behavior: https://github.com/cilium/cilium/blob/v1.18.6/pkg/shell/client/shell_client.go
- Cilium v1.18.6 source for shell server command registration: https://github.com/cilium/cilium/blob/v1.18.6/pkg/shell/server/shell_server.go
- Cilium v1.18.6 StateDB shell command source: https://github.com/cilium/cilium/blob/v1.18.6/vendor/github.com/cilium/statedb/script.go

## Issues Found
- The post claimed `cilium-agent shell -c "status"` was the non-interactive form. Official command references and source show the syntax is `cilium-agent shell [command] [args]...`; changed examples to pass commands as arguments, such as `cilium-agent shell help`.
- The post listed `status`, `endpoint list`, `identity list`, `endpoint get`, `policy get`, and `policy selectors` as shell commands. Cilium's shell registers commands such as `help`, `db`, and `db/show`; endpoint and policy inspection are `cilium-dbg` commands. Updated shell examples to use `help`, `db`, and `db/show health`, and moved endpoint/policy examples to `cilium-dbg`.
- The prerequisite stated Cilium v1.14+. Source checks showed no shell command in Cilium v1.14-v1.16, while the shell is present in newer Cilium versions; updated the prerequisite to Cilium v1.18+ for `cilium-agent shell`.
- The scripted usage section said commands could be piped into the shell and then used `cilium-dbg` commands. Reworded it to pass a shell command as arguments and changed the report to use `cilium-agent shell db` and `db/show --format=json health`, while keeping endpoint counting with `cilium-dbg`.
- The policy tracing example used `cilium-dbg policy trace`, which is not present in the current official `cilium-dbg policy` command reference. Replaced that advanced example with StateDB shell inspection.
- The verification command used `cilium-dbg status | grep "Overall Health"`, but current official examples use `cilium-dbg status` or `cilium-dbg status --brief`. Updated verification to `cilium-dbg status --brief`.
- The troubleshooting guidance recommended a nonexistent `-c` flag for CI usage. Updated it to pass a command as shell arguments.

## Review Notes
The corrected post now distinguishes between the Cilium agent shell's shell-exposed commands and the broader `cilium-dbg` command set. Future improvements could add concrete examples of specific StateDB tables available in a given Cilium release, but table availability can vary by version and enabled features.
