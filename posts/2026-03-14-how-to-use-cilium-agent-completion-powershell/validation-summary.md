# Validation Summary: How to Use cilium-agent completion powershell

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Cilium
- cilium-agent CLI
- PowerShell shell completion
- Kubernetes
- kubectl

## Sources Consulted
- Cilium command reference: `cilium-agent completion powershell` - https://docs.cilium.io/en/stable/cmdref/cilium-agent_completion_powershell/
- Cilium command reference: `cilium-agent` command index - https://docs.cilium.io/en/stable/cmdref/index_cilium-agent/
- Cilium system requirements - https://docs.cilium.io/en/stable/operations/system_requirements/
- Microsoft PowerShell profiles documentation - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles

## Issues Found
- The original post did not actually show `cilium-agent completion powershell`, despite the title and description being about that command. I replaced the unrelated Cilium operational examples with the official PowerShell completion command flow.
- The original examples used `cilium endpoint`, `cilium identity`, `cilium policy`, `cilium bpf`, `cilium metrics`, and similar commands. In current Cilium command reference, those agent/debugging commands are exposed through `cilium-dbg`, while the topic of this post is `cilium-agent completion powershell`. I removed those unrelated command examples and replaced them with completion generation, loading, and verification commands.
- The prerequisites incorrectly required the separate `cilium` CLI, Helm, Prometheus, and Grafana for a shell-completion setup. I narrowed the prerequisites to PowerShell, access to `cilium-agent`, and `kubectl` only when generating the script from a Cilium pod.
- The troubleshooting section contained Cilium datapath and policy troubleshooting procedures that were not relevant to PowerShell completion. I replaced them with completion-specific troubleshooting around missing binaries, PowerShell profiles, execution policy, stale generated scripts, and pod-based generation.
- The post mentioned a Linux kernel 4.19 troubleshooting baseline. Current Cilium system requirements recommend Linux kernel 5.10 or equivalent, with 4.18 on RHEL 8.10 listed as an equivalent exception. The unrelated kernel troubleshooting content was removed because it was not needed for a completion guide.

## Review Notes
The corrected guide assumes the reader either has `cilium-agent` available locally or can generate the completion script from a running Cilium agent pod. The official Cilium command reference documents loading completion for the current session with `cilium-agent completion powershell | Out-String | Invoke-Expression` and adding generated output to a PowerShell profile for future sessions.
