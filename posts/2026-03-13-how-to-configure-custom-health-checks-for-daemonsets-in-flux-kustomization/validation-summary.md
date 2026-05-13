# Validation Summary: How to Configure Custom Health Checks for DaemonSets in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux kustomize-controller health checks
- Kubernetes DaemonSet
- Kubernetes readiness probes
- Fluent Bit
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes API reference for DaemonSet status and rolling update fields: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Kubernetes sigs cli-utils kstatus DaemonSet health logic: https://raw.githubusercontent.com/kubernetes-sigs/cli-utils/master/pkg/kstatus/status/core.go
- Fluent Bit monitoring and health check documentation: https://docs.fluentbit.io/manual/administration/monitoring

## Issues Found
- The post described Flux DaemonSet health as only comparing desired and ready pods. Flux's built-in DaemonSet health assessment also checks observed generation, current scheduled count, updated scheduled count, and available count. Updated the explanation to reflect those checks.
- The basic health check description said Flux waits for all pods to be running and ready. Flux's DaemonSet assessment checks scheduled, updated, available, and ready counts rather than only pod phase. Updated the wording.
- The Fluent Bit readiness probe example used `/api/v1/health` without enabling Fluent Bit's HTTP server and health check. Added a ConfigMap and mount that enable `HTTP_Server` and `Health_Check` so the readiness probe endpoint exists.
- The dependency example set both `wait: true` and `healthChecks` on the same Kustomization. Flux ignores `healthChecks` when `wait: true` is enabled, so removed `wait: true` from that example to keep the explicit DaemonSet health check meaningful.

## Review Notes
- The examples use `apiVersion: kustomize.toolkit.fluxcd.io/v1`, which is current for Flux v2.x.
- The DaemonSet rolling update timeout guidance is directionally correct for the default `maxUnavailable: 1`, but actual rollout time also depends on `minReadySeconds`, image pull latency, node conditions, and whether `maxSurge` is configured.
