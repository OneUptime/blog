# Validation Summary: Understand GitHub for Cilium Users

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- GitHub
- Kubernetes
- kubectl
- Git
- Cilium CLI

## Sources Consulted
- Cilium CLI command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium CLI command reference index: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium code overview: https://docs.cilium.io/en/latest/contributing/development/codeoverview.html
- Cilium contributing guide: https://docs.cilium.io/en/stable/contributing/development/contributing_guide.html
- Cilium testing documentation: https://docs.cilium.io/en/latest/contributing/testing/
- Cilium documentation testing notes: https://docs.cilium.io/en/stable/contributing/docs/docsframework.html
- Cilium GitHub repository and issue/PR templates: https://github.com/cilium/cilium
- Cilium GitHub security advisories: https://github.com/cilium/cilium/security/advisories
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- GitHub notifications documentation: https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications

## Issues Found
- The operator log command used the outdated selector `name=cilium-operator`. Updated it to `io.cilium/app=operator`, matching the current Cilium CLI default selector for Cilium operator pods.
- The diagnostic command used `kubectl version --short`, but current Kubernetes documentation lists `kubectl version` with `--client` and `-o/--output` options, not `--short`. Updated it to `kubectl version`.
- The sysdump command passed a filename ending in `.zip`, but `cilium sysdump --output-filename` expects the resulting file name without an extension. Removed the `.zip` suffix.
- The contribution example used `make tests`, which is not a current top-level Cilium make target. Replaced it with `make test-docs` for documentation changes and kept the wording as "run the relevant tests".
- The post stated a specific PR title format as though it were required. Cilium's current contribution guidance and PR template require clear descriptions, tests, sign-off, issue links, and release-note information, but do not document that exact PR title format as mandatory. Updated the wording to request a clear PR title and PR template details.

## Review Notes
The guide is intentionally high-level and does not pin a Cilium or Kubernetes version. Future updates should re-check Cilium's GitHub labels, issue templates, and contribution workflow because those are repository-maintained conventions and may change over time.
