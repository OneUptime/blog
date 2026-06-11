# Validation Summary: How to Create Kubernetes Multi-Container Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods, init containers, native sidecar containers, lifecycle hooks, probes, volumes, and networking
- Kubernetes ConfigMaps, Secrets, PersistentVolumeClaims, and `emptyDir` volumes
- Fluent Bit log forwarding
- git-sync
- PgBouncer
- Envoy
- NGINX and NGINX Prometheus Exporter
- Prometheus Operator `PodMonitor`
- OpenTelemetry Collector

## Sources Consulted
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Container Lifecycle Hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes probe configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Docker logging documentation for official NGINX image behavior: https://docs.docker.com/engine/logging/
- NGINX `stub_status` module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- NGINX Prometheus Exporter documentation: https://github.com/nginx/nginx-prometheus-exporter
- git-sync v4 documentation: https://github.com/kubernetes/git-sync
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit environment variable documentation: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/yaml/environment-variables-section
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The logging sidecar example referenced `${POD_NAME}` and `${POD_NAMESPACE}` in the Fluent Bit configuration but did not define those environment variables in the container. Added downward API environment variables so the placeholders can resolve.
- The logging sidecar example implied an application environment variable would force NGINX file logging. Removed the misleading variable; the shared `/var/log/nginx` volume is the relevant mechanism in that example.
- The metrics example used a `ServiceMonitor` to scrape a standalone Pod without defining a matching Kubernetes Service. Changed it to a Prometheus Operator `PodMonitor` and used `podMetricsEndpoints`, which matches the Pod-based example.
- The lifecycle sequence diagram showed `SIGTERM` before the `preStop` hook. Kubernetes runs the `preStop` hook before sending the TERM signal, so the diagram was corrected.
- The startup-order section said to use a readiness gate but did not define a Kubernetes `readinessGates` field, and the example did not actually control container startup order. Replaced it with a native restartable init-container sidecar using `restartPolicy: Always` and a readiness probe.
- The OpenTelemetry Collector sidecar mounted an `emptyDir` subPath as `/etc/otel`, which would not provide the referenced `/etc/otel/config.yaml`. Changed the mount to use a ConfigMap-backed `otel-config` volume.

## Review Notes
The examples are generally illustrative and still assume supporting resources exist, such as referenced ConfigMaps, Secrets, Services, external DNS names, and application images. For production use, readers should pin image versions appropriate to their platform, provide the referenced configuration objects, and prefer Kubernetes controllers such as Deployments over bare Pods for managed workloads.
