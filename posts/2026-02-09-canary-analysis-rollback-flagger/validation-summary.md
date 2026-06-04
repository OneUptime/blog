# Validation Summary: How to Use Canary Analysis Automated Rollback Tests with Flagger on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flagger
- Linkerd
- Prometheus metrics
- Canary deployments
- Automated rollback
- Flagger load tester and webhooks

## Sources Consulted
- Flagger Linkerd canary deployment tutorial: https://fluxcd.io/flagger/tutorials/linkerd-progressive-delivery/
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Linkerd progressive delivery with Flagger documentation: https://linkerd.io/docs/tasks/flagger/
- Flagger load tester kustomize manifests: https://github.com/fluxcd/flagger/tree/main/kustomize/tester

## Issues Found
- The installation verification checked pods in the `linkerd` namespace, but the Flagger Linkerd kustomize install deploys Flagger in `flagger-system`. Changed the verification command to `kubectl -n flagger-system rollout status deploy/flagger`.
- The canary webhook referenced `flagger-loadtester.default`, but the official Flagger tester kustomization deploys the service in the `test` namespace. Updated the example to create and annotate the `test` namespace, install the load tester there, set the Canary namespace to `test`, and use `flagger-loadtester.test` and `myapp-canary.test`.
- The webhook example omitted the webhook `type`. Although the CRD allows an empty value, the current Flagger documentation uses `type: rollout` for load-test webhooks during canary analysis. Added `type: rollout`.
- The simulated rollback section showed an incomplete `apps/v1` Deployment manifest that would not be valid as a standalone Deployment because it lacked required fields such as `spec.selector` and matching pod template labels. Replaced it with a `kubectl set image` command that updates the existing deployment and triggers Flagger analysis.
- Namespace-specific commands for triggering and watching the canary were missing `-n test`. Added the namespace to keep the workflow consistent with the Canary resource.

## Review Notes
The post assumes an existing `myapp` Deployment with labels compatible with Flagger's selector requirements and a container named `myapp`. That is reasonable for a focused Flagger canary example, but a future expansion could include the initial Deployment and Service manifests for a fully self-contained walkthrough.
