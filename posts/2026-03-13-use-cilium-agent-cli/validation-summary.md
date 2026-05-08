# Validation Summary: How to Use cilium-agent

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- cilium-agent
- cilium-dbg
- Hive framework
- eBPF
- Graphviz

## Sources Consulted
- Cilium Component Overview: https://docs.cilium.io/en/stable/overview/component-overview/
- Cilium Command Reference for cilium-agent: https://docs.cilium.io/en/stable/cmdref/index_cilium-agent/
- Cilium cilium-agent command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent/
- Cilium cilium-agent completion bash command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent_completion_bash/
- Cilium cilium-agent hive dot-graph command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive_dot-graph/
- Cilium cilium-agent shell command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent_shell/
- Cilium cilium-dbg config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/

## Issues Found
- The introduction and conclusion implied that `cilium-agent` itself provides configuration inspection. Cilium's official component overview and command reference identify `cilium-dbg` as the debug CLI used to inspect local agent state and configuration. Updated the wording to describe `cilium-agent` as providing shell access and Hive graph inspection, and to mention `cilium-dbg` for runtime configuration inspection.
- The bash completion example said "On local machine with cilium CLI" before running `cilium-agent completion bash`. The official documentation distinguishes the local `cilium` management CLI from in-agent binaries such as `cilium-agent` and `cilium-dbg`. Updated the comment to "On a system where cilium-agent is installed."

## Review Notes
The listed `cilium-agent` subcommands, `cilium-agent hive dot-graph`, `cilium-agent shell`, `cilium-agent --version`, and `cilium-dbg config --all` commands match the current official Cilium command reference. Some components shown in the architecture diagram, such as BGP and Hubble, are feature-dependent in real deployments.
