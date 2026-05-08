# Validation Summary: Understand the Cilium Slack Community

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Kubernetes kubectl
- Cilium and eBPF Slack
- Linux diagnostic commands

## Sources Consulted
- Cilium documentation: Getting Help, https://docs.cilium.io/en/stable/gettingstarted/gettinghelp/
- Cilium documentation: Community Meetings and Slack channels, https://docs.cilium.io/en/stable/community/community/
- Cilium command reference: cilium sysdump, https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium command reference: cilium status, https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes kubectl reference: kubectl version, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Cilium community Slack guidelines, https://github.com/cilium/community/blob/main/slack-guidelines.md

## Issues Found
- The join instructions referenced `cilium.io/slack`, which currently redirects to a 404. Changed the guidance to use the official Cilium docs Slack link, `https://slack.cilium.io/`.
- The channel table included outdated or unverified channel names such as `#installation`, `#servicemesh`, and `#announcements`. Updated the table to match Cilium's documented public channel list, including `#service-mesh`, `#release`, `#kubernetes`, and `#tetragon`.
- The diagnostic command used `kubectl version --short`, but the current Kubernetes kubectl reference documents `kubectl version` with `--client` and `-o yaml|json`, not `--short`. Replaced it with `kubectl version`.
- The sysdump command passed a `.zip` suffix to `--output-filename`, but the Cilium CLI documents that this flag takes the resulting file name without extension. Removed the `.zip` suffix.
- The Slack message template had an invalid nested Markdown code fence. Changed the outer fence to four backticks so the inner log-output fence renders correctly.
- The best-practices section suggested tagging messages with a `:resolved:` emoji, which is not part of the published Cilium Slack guidelines. Changed it to the already-supported practice of updating the thread with a `Resolved:` note.

## Review Notes
The post is technically relevant as a community support guide because it includes Cilium CLI, kubectl, sysdump, Linux diagnostic commands, and Cilium Slack channel guidance. The Cilium Slack invite target is time-sensitive because Slack invite links rotate; the post now points to the stable official docs link rather than embedding a specific invite token.
