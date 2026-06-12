# Validation Summary: How to Monitor Applications on OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenShift Container Platform monitoring
- User Workload Monitoring
- Prometheus
- Alertmanager
- ServiceMonitor
- PrometheusRule
- OpenShift web console dashboards
- OpenTelemetry

## Sources Consulted
- Red Hat OpenShift Container Platform 4.17 monitoring overview: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/monitoring/index
- Red Hat OpenShift Container Platform 4.12 enabling monitoring for user-defined projects: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/monitoring/enabling-monitoring-for-user-defined-projects
- Red Hat OpenShift Container Platform 4.17 ServiceMonitor API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/monitoring_apis/servicemonitor-monitoring-coreos-com-v1
- Red Hat OpenShift Container Platform 4.17 monitoring APIs, including PrometheusRule: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/monitoring_apis/monitoring-apis
- Red Hat OpenShift Container Platform 4.11 release notes, Grafana component removal: https://docs.redhat.com/en/documentation/openshift_container_platform/4.11/html/release_notes/ocp-4-11-release-notes

## Issues Found
- The post described Grafana as part of the built-in OpenShift monitoring stack and recommended using Grafana for dashboards. This is outdated for OpenShift 4.11 and later because the Grafana component and direct Prometheus/Grafana UI access were removed from the monitoring stack. I changed those references to OpenShift console dashboards and Observe views.

## Review Notes
The ServiceMonitor, PrometheusRule, ConfigMap, and oc command examples are structurally consistent with OpenShift monitoring documentation. The alert expression assumes the application exposes an `http_requests_total` metric with `status` labels and that the resulting job label is `api`; this is reasonable for the example but depends on the application metrics implementation.
