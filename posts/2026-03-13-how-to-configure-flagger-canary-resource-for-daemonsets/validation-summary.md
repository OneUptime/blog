# Validation Summary: How to Configure Flagger Canary Resource for DaemonSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger Canary resources
- Kubernetes DaemonSets
- Kubernetes Services
- kubectl
- Prometheus MetricTemplates
- Flagger load tester webhooks

## Sources Consulted
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger introduction and routing provider overview: https://docs.flagger.app/
- Flagger upgrade guide noting DaemonSet target support: https://docs.flagger.app/main/dev/upgrade-guide
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger DaemonSet controller source: https://github.com/fluxcd/flagger/blob/main/pkg/canary/daemonset_controller.go
- Flagger scheduler/controller source: https://github.com/fluxcd/flagger/blob/main/pkg/controller/scheduler.go
- Flagger Canary API types: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The post incorrectly stated that DaemonSet canaries cannot use traffic-based weight shifting and cannot use `maxWeight` and `stepWeight`. Flagger's CRD and controller support those Canary analysis fields for DaemonSet targets when the configured routing provider supports traffic routing. I changed this to explain that traffic splitting depends on the provider, and that Flagger's `kubernetes` provider uses `iterations` because progressive traffic shifting is not supported there.
- The post described Flagger as creating a canary DaemonSet during analysis. Flagger actually creates a `<targetRef.name>-primary` DaemonSet and uses the original target DaemonSet as the canary workload. I updated the workflow text and diagram accordingly.
- The post described the DaemonSet flow as a node-level rollout and implied validation happens before the update reaches every node. Flagger scales the target DaemonSet down and back up, then promotes by copying the target spec into the primary DaemonSet. I updated the description and conclusion to reflect the primary/target DaemonSet promotion model.
- The update strategy guidance implied an explicit `RollingUpdate` setting is always required. Flagger rejects non-`RollingUpdate` DaemonSet strategies, while Kubernetes defaults an unset DaemonSet strategy to `RollingUpdate`. I clarified that either explicit `RollingUpdate` or leaving the field unset is acceptable.

## Review Notes
The YAML examples use current `apps/v1`, `v1`, and `flagger.app/v1beta1` APIs and match the Flagger Canary schema. The DaemonSet selector uses the default Flagger-supported `app` selector label. The example assumes a routing and metrics setup where Flagger's built-in `request-success-rate` metric is available.
