# Validation Summary: How to Implement Linkerd Canary Deployments

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Linkerd
- Linkerd Viz
- Linkerd SMI / SMI TrafficSplit
- Flagger
- Kubernetes Deployments and Services
- Helm
- Prometheus / PromQL
- Flagger MetricTemplate, Canary, AlertProvider, and webhooks

## Sources Consulted
- Linkerd Getting Started and CLI installation docs: https://linkerd.io/2-edge/getting-started/
- Linkerd install docs: https://linkerd.io/2-edge/tasks/install/
- Linkerd TrafficSplit feature docs: https://linkerd.io/2-edge/features/traffic-split/
- Linkerd SMI extension docs: https://linkerd.io/2-edge/tasks/linkerd-smi/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd progressive delivery with Flagger docs: https://linkerd.io/2-edge/tasks/flagger/
- Flagger Linkerd canary deployment tutorial: https://docs.flagger.app/tutorials/linkerd-progressive-delivery
- Flagger install docs: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger metrics analysis docs: https://docs.flagger.app/usage/metrics
- Flagger webhooks docs: https://docs.flagger.app/usage/webhooks
- Flagger alerting docs: https://docs.flagger.app/usage/alerting
- Flagger Canary CRD schema: https://github.com/fluxcd/flagger/blob/main/artifacts/flagger/crd.yaml
- Linkerd SMI CLI source for uninstall command verification: https://github.com/linkerd/linkerd-smi

## Issues Found
- The post used SMI TrafficSplit without installing Linkerd's SMI extension. Added the `linkerd-smi` CLI installation, `linkerd smi install`, and `linkerd smi check` commands.
- The post did not mention that Linkerd SMI TrafficSplit support is deprecated. Added a short note explaining that this guide uses the supported Flagger Linkerd/TrafficSplit path, while new production designs should evaluate Gateway API routing.
- The Flagger Helm install was installed into `linkerd-viz` without explicitly installing the Canary CRD or setting `crd.create=false`. Updated the commands to install the CRD first and install Flagger into `flagger-system` with `--create-namespace`.
- The expected `kubectl get pods` output had an incorrect `RUNNING` column header. Changed it to the standard `RESTARTS` column.
- The load tester namespace was not configured for Linkerd injection, which can prevent Linkerd-controlled traffic splitting from being observed for generated traffic. Added the namespace annotation before installing the load tester.
- The Canary comments implied `gatewayRefs` belonged to this SMI TrafficSplit example. Replaced the commented Istio-style gateway example with a note that this SMI-based example does not set `gatewayRefs`.
- The Linkerd Prometheus queries omitted the `direction` label and template variables used in current Flagger Linkerd examples. Updated the success-rate, latency, and custom metric templates to include `direction="{{ variables.direction }}"`, use `deployment=~"{{ target }}"`, and added `templateVariables: direction: inbound` to metric references.
- The success-rate query used `classification="success"` instead of Flagger's documented Linkerd pattern of excluding failures. Changed it to `classification!="failure"`.
- The failed-canary example referenced a non-existent-looking `ghcr.io/stefanprodan/podinfo:6.0.0-fault` image. Replaced it with a valid podinfo image update and a bounded `hey` command against podinfo's `/status/500` endpoint from the load tester.
- The article described Flagger `threshold` as successful iterations before promotion. Corrected the comments to state that `threshold` is the maximum number of failed metric checks tolerated before rollback.
- Troubleshooting and cleanup commands still referenced the old Flagger namespace. Updated them to `flagger-system` and added Linkerd SMI cleanup.

## Review Notes
The corrected article is technically valid for the SMI TrafficSplit-based Flagger Linkerd workflow. Because Linkerd marks SMI TrafficSplit as deprecated, a future refresh should consider rewriting the tutorial around Gateway API/dynamic request routing once the desired production path for this blog is chosen.
