# Validation Summary: How to Configure Startup Probes for Slow-Starting Applications in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes startup, liveness, and readiness probes
- kubectl
- Spring Boot Actuator
- Node.js with Express
- Python with Flask
- Prometheus Operator ServiceMonitor and PrometheusRule
- kube-state-metrics
- Java CDS/AppCDS

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl reference: set image: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Spring Boot Actuator reference: Kubernetes probes and health groups: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Prometheus Operator API reference: ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation: kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metric reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Dev.java CDS and AppCDS guide: https://dev.java/learn/jvm/cds-appcds/

## Issues Found
- The Spring Boot example used `/actuator/health/startup` and stated that Actuator provides a built-in startup health endpoint. Spring Boot Actuator documents built-in liveness and readiness health groups, not a built-in startup health group from the properties shown. Changed the startup probe to use `/actuator/health/liveness` and updated the explanation.
- The Spring Boot startup probe comment said `failureThreshold: 36` with a 30-second initial delay was "6 minutes total". Changed the comment to clarify it is 6 minutes after the initial delay.
- The migration section said the new startup probe provided the same startup tolerance as the old liveness probe delay, but the example's timing was not identical. Reworded it to describe the dedicated startup window without claiming exact equivalence.
- The PrometheusRule example was not a valid Prometheus Operator resource because it omitted `apiVersion`, `kind`, `metadata`, and `spec`. Added the CRD structure.
- The Prometheus alert expression would have fired for any matching pod older than 5 minutes, including healthy long-running pods. Updated it to alert only for matching pods that are still not ready.

## Review Notes
The Kubernetes probe behavior, probe field names, kubectl commands, HTTP/TCP/exec probe examples, Express and Flask illustrative endpoint snippets, ServiceMonitor shape, and Java CDS flags are technically consistent with the consulted documentation. The Prometheus startup alert assumes kube-state-metrics is installed and exposing pod readiness and start-time metrics.
