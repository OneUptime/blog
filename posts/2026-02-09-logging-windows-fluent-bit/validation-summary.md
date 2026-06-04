# Validation Summary: How to Set Up Logging for Windows Containers with Fluent Bit on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Windows containers
- Windows HostProcess Pods
- Fluent Bit
- Fluent Bit tail, winlog, kubernetes, grep, modify, nest, stdout, Elasticsearch, Loki, CloudWatch, windows_exporter_metrics, and prometheus_exporter plugins
- IIS logs
- Windows Event Logs
- C# / Newtonsoft.Json structured logging
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Fluent Bit Windows installation documentation: https://docs.fluentbit.io/manual/installation/downloads/windows
- Fluent Bit Kubernetes deployment documentation: https://docs.fluentbit.io/manual/installation/kubernetes
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Windows Event Log input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/windows-event-log
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit CloudWatch Logs output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/cloudwatch
- Fluent Bit stdout output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/standard-output
- Fluent Bit Windows exporter metrics input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/windows-exporter-metrics
- Fluent Bit Prometheus exporter output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/prometheus-exporter
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/setup/windows/intro-windows-in-kubernetes/
- Kubernetes Windows HostProcess Pod documentation: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes hostPath volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Windows storage documentation: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Fluent Bit Docker Hub image tags: https://hub.docker.com/r/fluent/fluent-bit/tags

## Issues Found
- The Windows logging explanation incorrectly implied Windows container stdout/stderr logs are not written to node log files. Updated it to clarify that Kubernetes writes stdout/stderr to node log files, while Windows Event Logs, IIS logs, and application file logs require explicit collection configuration.
- The DaemonSet examples used the stale `fluent/fluent-bit:2.1-windowsservercore` image tag. Updated them to a current Windows Server 2022 Fluent Bit tag and added a note to choose an image tag matching the Windows node version.
- The Windows DaemonSet examples collected host Windows Event Logs without HostProcess configuration. Added `securityContext.windowsOptions.hostProcess`, `runAsUserName`, and `hostNetwork: true`; used `Local service` for general collection and `SYSTEM` where the Security event log is included.
- The container log examples assumed Docker JSON parsing. Updated Kubernetes container log parsing to use a CRI parser and made the Elasticsearch and Loki ConfigMaps include the parser configuration.
- The IIS ConfigMap referenced `parsers.conf` but did not define the IIS parser in that ConfigMap. Added the missing `parsers.conf` data.
- The event log pipeline used `Tag eventlog` while filters and outputs matched `eventlog.*`, so records would not route. Changed the tag to `eventlog.windows`.
- Elasticsearch examples used mapping `Type` values that are incompatible with Elasticsearch 8 unless suppressed. Removed the type setting where appropriate and set `Suppress_Type_Name On` for the IIS Elasticsearch output.
- The C# usage example referenced `ex.Message` without declaring `ex`. Wrapped the error logging example in a `try`/`catch`.
- The monitoring example used Linux-only `cpu` and `mem` inputs on Windows. Replaced them with the Windows `windows_exporter_metrics` input and routed it to `prometheus_exporter`.
- The ServiceMonitor selected Services with `app: fluent-bit-windows`, but the Service had no matching label. Added the missing Service label.

## Review Notes
Classic Fluent Bit configuration syntax is still valid in current Fluent Bit, but Fluent Bit documentation now presents YAML configuration as the standard format in newer versions. The post remains technically valid using classic configuration because the examples target Fluent Bit's supported classic config format.
