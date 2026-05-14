# Validation Summary: Getting Help with Cilium: Community Resources and Support Channels

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Hubble
- GitHub CLI
- kubectl

## Sources Consulted
- Cilium Getting Help documentation: https://docs.cilium.io/en/stable/gettingstarted/gettinghelp/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Community and Slack channel documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium CLI `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium debug CLI `debuginfo` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_debuginfo/
- GitHub CLI `gh issue list` manual: https://cli.github.com/manual/gh_issue_list
- GitHub Discussions GraphQL API documentation: https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions

## Issues Found
- Replaced `cilium debuginfo` with `cilium sysdump --output-filename cilium-sysdump` for Kubernetes troubleshooting. Official Cilium documentation indicates `cilium-dbg debuginfo` is the debug command and that Kubernetes users should attach a system dump; `debuginfo` is automatically included as part of the system dump.
- Updated the Cilium operator log selector from `name=cilium-operator` to `io.cilium/app=operator`, matching the current default Cilium operator selector in the Cilium CLI documentation.
- Replaced the invalid `gh api repos/cilium/cilium/discussions` example with the GitHub Discussions URL. GitHub Discussions are exposed through the GraphQL API, not the repository REST endpoint shown in the post.
- Changed `cilium sysdump --output-filename cilium-sysdump.zip` to `cilium sysdump --output-filename cilium-sysdump` because the Cilium CLI documents this flag as the resulting file name without extension.
- Replaced references to the undocumented `#help` Slack channel with `#general`, which Cilium documents as the channel for general user discussions and questions.
- Updated the best-practice recommendation from attaching `cilium debuginfo` output to attaching a `cilium sysdump` archive.

## Review Notes
The post is technically relevant and generally accurate after the targeted command and channel corrections. Future updates could mention reviewing sysdump archives for sensitive data before sharing, which Cilium explicitly recommends.
