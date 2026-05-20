# Validation Summary: How to Deploy Falco with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco
- Falcosidekick
- Argo CD
- Helm
- Kubernetes
- Prometheus Operator ServiceMonitor
- Loki

## Sources Consulted
- Falco CNCF project page: https://www.cncf.io/projects/falco/
- Falco Helm chart source and values: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falcosidekick Helm chart source and values: https://github.com/falcosecurity/charts/tree/master/charts/falcosidekick
- Falco default and local rules files documentation: https://falco.org/docs/concepts/rules/default-custom/
- Falco kernel event source documentation: https://falco.org/docs/concepts/event-sources/kernel/
- Falco default rules reference: https://falco.org/docs/reference/rules/default-rules/
- Falco Kubernetes audit plugin documentation: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Argo CD Application specification example: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/application.yaml

## Issues Found
- The Falco Helm chart version was outdated. Updated the dependency from `4.12.0` to the current chart version `8.0.5`.
- The Falcosidekick Helm chart version was outdated. Updated the dependency from `0.8.5` to the current chart version `0.13.1`.
- The Falco config used `rules_file`, which is deprecated in current Falco releases. Changed it to `rules_files`.
- The Falco values used `serviceMonitor.enabled`, but the Falco chart uses `serviceMonitor.create`. Updated the field.
- The Falco config used obsolete output throttling keys `outputs_rate` and `outputs_max_burst`. Replaced them with the current `outputs_queue.capacity` structure.
- The custom `Kubectl Exec to Pod` rule used Kubernetes audit fields and macros without configuring the Kubernetes audit plugin. Replaced it with a syscall-based interactive shell rule that works with the deployment shown in the post.
- The Falcosidekick ServiceMonitor labels field used `labels`, but the chart uses `additionalLabels`. Updated the field.
- The Falcosidekick Prometheus comment incorrectly described a push gateway. Updated the comment to describe adding Prometheus metric labels.

## Review Notes
- The `kubectl exec` verification remains valid because Falco's syscall rules can detect an interactive shell in a container; exact results depend on the workload image and whether the shell exists.
- Kubernetes audit-event rules require a separate k8s audit plugin and API server audit webhook setup, which is outside the scope of this post.
