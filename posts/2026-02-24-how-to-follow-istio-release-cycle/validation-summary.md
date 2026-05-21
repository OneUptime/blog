# Validation Summary: How to Follow Istio Release Cycle

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- GitHub CLI
- GitHub Releases API
- Kubernetes CronJob
- kind

## Sources Consulted
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Upgrade documentation: https://istio.io/latest/docs/setup/upgrade/
- Istio Canary Upgrades documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- GitHub CLI gh release list reference: https://cli.github.com/manual/gh_release_list
- GitHub Releases latest API endpoint for istio/istio: https://api.github.com/repos/istio/istio/releases/latest

## Issues Found
- The snippets that set `CURRENT` from `istioctl version --remote=false | head -1` captured the full `client version: ...` line instead of just the version string, which would not work as a GitHub release tag and would compare incorrectly with the GitHub API result. Updated the snippets to parse the client version field with `awk`.
- The upgrade guidance said not to skip versions without qualification. Official Istio documentation requires each intermediate minor release for in-place upgrades, but supports jumping across two minor versions for revision-based canary upgrades. Updated the text and example comments to make that distinction.
- The Istio 1.20 Kubernetes compatibility line omitted Kubernetes 1.29, which the official supported releases page lists as supported for Istio 1.20. Added Kubernetes 1.29.
- The command `kubectl version --short` is not present in the current official kubectl version reference. Replaced it with `kubectl version`.

## Review Notes
- The version examples use older Istio releases, and Istio 1.20, 1.21, and 1.22 are now end-of-life as of the review date. They still work as historical examples, but future refreshes should consider updating the sample versions and upgrade calendar to currently supported releases.
