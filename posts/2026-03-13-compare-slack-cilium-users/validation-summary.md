# Validation Summary: Using Slack for Cilium Community Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium Slack community
- Kubernetes
- kubectl
- Cilium CLI
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Community Slack documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium Getting Help documentation: https://docs.cilium.io/en/stable/gettingstarted/gettinghelp.html
- Cilium CLI `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference index, including `cilium version`: https://docs.cilium.io/en/latest/cmdref/
- Kubernetes generated `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Cilium Kubernetes policy documentation for namespace labels and CiliumNetworkPolicy behavior: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Slack workspace URL check: https://cilium.slack.com/

## Issues Found
- The channel list named `#help` as the main support channel, but the current Cilium Slack documentation lists `#general` for general user discussions and questions. Changed support/question references from `#help` to `#general`.
- The channel list used `#cilium-dev`, but the current Cilium Slack documentation lists `#development` for development discussions. Changed `#cilium-dev` to `#development`.
- The channel list described `#release` as an upgrade discussion channel, but Cilium documents it as release announcements only. Narrowed the description to release announcements.
- The Kubernetes version command used `kubectl version --short`, but the current generated Kubernetes reference for `kubectl version` does not include a `--short` flag. Changed it to `kubectl version`.
- The prerequisite link `https://cilium.io/slack` currently redirects to a 404. Changed it to the responding Cilium Slack workspace URL, `https://cilium.slack.com`.
- The nested Markdown code fences in the example question were malformed. Changed the outer fence to four backticks and corrected the inner closing fences so the example renders as intended.

## Review Notes
The local environment does not have `kubectl` installed, so kubectl flag validation was performed against the current official generated Kubernetes command reference rather than local `--help` output.
