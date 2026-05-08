# Validation Summary: How to Understand Release Cadence in the Cilium Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Cilium CLI
- cilium-dbg
- Mermaid

## Sources Consulted
- Cilium release organization documentation: https://docs.cilium.io/en/stable/contributing/release/organization.html
- Cilium backporting process: https://docs.cilium.io/en/stable/contributing/release/backports/
- Cilium GitHub repository stable release list: https://github.com/cilium/cilium
- Cilium upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium CLI `version` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium community Slack channel documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium v1.15.0 GitHub release: https://github.com/cilium/cilium/releases/tag/v1.15.0
- Cilium v1.16.0 GitHub release: https://github.com/cilium/cilium/releases/tag/v1.16.0

## Issues Found
- The post described Cilium minor releases as quarterly. Updated this to feature releases around every six months, matching the official release organization documentation.
- The post described each minor version as receiving approximately 12 months of security maintenance and CVE backports to the two most recent minor versions. Updated this to Cilium's current policy of maintaining the latest three minor stable branches, with different backport criteria for the current minor release and the two previous minor releases.
- The versioning section described Cilium as semantic versioning while also saying minor releases may include breaking changes. Updated the wording to the official `X.Y.Z` version format and described minor releases as potentially upgrade-impacting.
- The release candidate example used `1.16.0-rc1`. Updated it to the Cilium release tag style `v1.16.0-rc.0`.
- The Mermaid Gantt chart used `YYYY-Q`, which is not a reliable Mermaid Gantt date format, and placed Cilium v1.15.0 and v1.16.0 in the wrong quarters. Updated the chart to `YYYY-MM-DD` and the actual v1.15.0 and v1.16.0 release dates.
- The maintained-versions check pointed to GitHub releases and said maintained branches were listed there. Updated it to point to the Cilium repository README, which lists actively maintained stable releases.
- The upgrade planning guidance recommended staying within N-1 of the current minor release. Updated it to plan upgrades one minor release at a time, matching the official upgrade guide's tested upgrade and rollback path.
- The notification section referenced `#announce`, which is not listed in the official Cilium Slack channel documentation. Updated it to the documented `#release` channel and the Cilium community page.
- The Helm upgrade example used `--reuse-values` for a version upgrade. Updated it to use a values file because the official upgrade guide warns not to use `--reuse-values` when upgrading between minor releases.

## Review Notes
The `cilium version` and `kubectl exec -n kube-system ds/cilium -- cilium-dbg version` commands are valid command examples. The Helm command is still intentionally generic; production upgrades should follow the version-specific Cilium upgrade notes before running it.
