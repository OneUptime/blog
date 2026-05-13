# Validation Summary: Explaining the Cilium GitHub Issue Workflow for Users

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- GitHub Issues and pull requests
- GitHub CLI (`gh`)
- Kubernetes CLI usage for Cilium diagnostics

## Sources Consulted
- Cilium issue triage process: https://docs.cilium.io/en/latest/contributing/development/reviewers_committers/triage/
- Cilium release organization and stable branch policy: https://docs.cilium.io/en/stable/contributing/release/organization/
- Cilium backporting process: https://docs.cilium.io/en/stable/contributing/release/backports/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium policy troubleshooting guide: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- GitHub CLI `gh issue view` manual: https://cli.github.com/manual/gh_issue_view
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- GitHub CLI `gh release view` manual: https://cli.github.com/manual/gh_release_view
- Cilium GitHub issue templates and labels in the official repository: https://github.com/cilium/cilium/tree/main/.github/ISSUE_TEMPLATE and https://api.github.com/repos/cilium/cilium/labels

## Issues Found
- The introduction attributed the workflow specifically to Isovalent's full-time engineering team. I changed this to active maintainers and contributors because the public workflow is a project process, not solely an Isovalent staff process.
- The post said a bot adds labels and that triage happens in 24-72 hours. I changed this to GitHub applying issue-template labels and removed the fixed triage window because the official issue templates define initial labels and the triage docs do not guarantee that timeframe.
- Several labels were stale or inaccurate for the current Cilium repository. I replaced `kind/enhancement`, `sig/installation`, `sig/ebpf`, `priority/critical`, and `backport/stable` with current labels such as `kind/feature`, `area/helm`, `area/datapath`, `severity/high`, `needs-backport/X.Y`, and `backport/X.Y`.
- The PR search command claimed to check merged PRs but omitted `--state merged`; `gh pr list` defaults to open PRs. I added `--state merged`.
- The release example used old v1.15-era release numbering. I updated the example to v1.19.3, which matches the current stable documentation reviewed.
- The policy diagnostic example used `cilium policy trace`, which is not present in the current Cilium command reference. I replaced it with current `cilium-dbg endpoint list` and `cilium-dbg monitor -t policy-verdict` examples.
- The backport policy section used outdated stable branch examples and implied critical fixes are backported within days. I updated the examples to v1.17-v1.19 and aligned the wording with the documented backport criteria and patch release process.
- The stable branch listing command used the GitHub API without pagination, which may miss branches. I added `gh api --paginate`.

## Review Notes
The post is now technically accurate as a high-level workflow guide, but Cilium labels and supported stable branches change over time. Future reviews should re-check the Cilium repository labels and issue templates before republishing.
