# Validation Summary: How to Follow Istio Roadmap

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Kubernetes Gateway API
- GitHub and GitHub CLI
- istioctl
- kubectl

## Sources Consulted
- Istio Feature Status: https://istio.io/latest/docs/releases/feature-stages/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Upgrade documentation: https://istio.io/latest/docs/setup/upgrade/
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio Working Groups documentation: https://github.com/istio/community/blob/master/WORKING-GROUPS.md
- Istio GitHub milestones and labels: https://github.com/istio/istio/milestones and https://github.com/istio/istio/labels
- GitHub CLI help output for `gh issue list` and `gh pr list`

## Issues Found
- The feature status page URL used `istio.io/latest/about/feature-stages/`, which redirects but is not the current canonical Istio documentation URL. Changed it to `istio.io/latest/docs/releases/feature-stages/`.
- The feature stage descriptions overstated Beta API stability and Stable backward compatibility. Updated the wording to match Istio's published feature phase definitions, including Beta production evaluation and Stable strictly compatible changes.
- The design proposal search used a non-existent `kind/design-doc` label. Changed the GitHub issue search and `gh issue list` example to use the current `kind/enhancement` label.
- The design document location was described too narrowly as GitHub issues or repository markdown. Updated the notes to point readers to working group design docs in shared Google Drive folders linked from `WORKING-GROUPS.md`.
- The upgrade guidance said upgrades must happen one minor version at a time. Updated it to Istio's current documented warning that upgrades across more than two minor versions in one step are not officially tested or recommended.
- The deprecation timing claimed there are typically at least two minor releases before removal. Updated it to reflect Istio's phase-dependent policy: Experimental and Alpha features can be removed without notice, while Beta and Stable have stronger notice and compatibility expectations.
- The tracking advice referenced `#istio-dev`, which is not listed in the current official working group channel table. Changed it to reference the relevant working group Slack channels.

## Review Notes
The remaining commands and references are technically plausible: `gh api`, `gh issue list`, and `gh pr list` use supported flags; `kubectl api-resources | grep istio`, `istioctl version`, and `istioctl analyze --all-namespaces` are valid operational checks. The "Key Areas to Watch Right Now" section is time-sensitive but aligns with current Istio documentation showing Ambient mode, Gateway API, multicluster, and ztunnel-related work as active areas.
