# Validation Summary: How to Use Revision Tags for Safe Istio Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio revision-based upgrades
- Istio revision tags
- MutatingWebhookConfiguration
- istioctl
- kubectl

## Sources Consulted
- Istio Canary Upgrades documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio revision tags blog: https://istio.io/latest/blog/2021/revision-tags/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio revision tag webhook template: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/templates/revision-tags-mwc.yaml

## Issues Found
- The post said namespaces with both `istio-injection=enabled` and `istio.io/rev=stable` have unpredictable behavior. Istio documentation states that `istio-injection` takes precedence over `istio.io/rev` for backward compatibility, so the wording was corrected.
- The cleanup section removed the `canary` tag while the earlier example still had `test-app` labeled `istio.io/rev=canary`. Istio's command reference warns that removing a tag disrupts sidecar injection in namespaces that still reference it, so the cleanup commands now relabel and restart `test-app` before removing the tag.
- The webhook inspection section said the webhook configuration contains the `objectSelector` matching the tag name. The current Istio revision tag template uses both namespace and object selectors depending on the injection case, so the wording was generalized to "selectors matching the tag name."

## Review Notes
- The command examples use older Istio version numbers as revision names. The revision tag workflow and command syntax are still valid, but operators should use currently supported Istio versions in real clusters.
