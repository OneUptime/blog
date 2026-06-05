# Validation Summary: How to Instrument Tekton Pipeline Tasks with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton Tasks, TaskRuns, PipelineRuns, workspaces, and variable substitution
- Kubernetes
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector Helm chart
- OTLP trace and metric export

## Sources Consulted
- Tekton TaskRuns documentation: https://tekton.dev/docs/pipelines/taskruns/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton variable substitutions documentation: https://tekton.dev/docs/pipelines/variables/
- Tekton labels and annotations documentation: https://tekton.dev/docs/pipelines/labels/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/

## Issues Found
- The introduction incorrectly stated that each TaskRun and PipelineRun is a pod. Updated it to say that a PipelineRun creates TaskRuns, and each TaskRun runs its steps in a Kubernetes pod.
- The Helm installation command used a service name later referenced as `otel-collector.otel-system` without ensuring that name would be created. Added `fullnameOverride=otel-collector`.
- The Collector install command enabled Kubernetes metadata enrichment in later examples but did not enable the Helm chart's Kubernetes attributes preset. Added `presets.kubernetesAttributes.enabled=true`.
- The Python trace example implied Tekton automatically sets custom `TEKTON_*` environment variables. Updated the comment and Task YAML so Tekton context values are explicitly mapped into environment variables.
- The Python build wrapper recorded non-zero command exit codes but did not fail the task. Updated it to set span error status, raise `CalledProcessError`, preserve the command exit code, and flush spans in a `finally` block.
- The trace context section overstated that writing a traceparent file automatically ensures all tasks become children of the same root trace. Clarified that producers must save context while a span is current and consumers must load it before creating spans.
- The Task section described a sidecar approach, but the YAML used only a normal step. Changed the wording to step-level instrumentation.
- The Task YAML used `$(context.pipelineRun.name)` directly inside a Task. Tekton documents PipelineRun context variables at Pipeline scope, so the example now passes Pipeline metadata as Task params and uses Task-level context variables only for Task metadata.
- The metrics example recorded metrics in a short-lived task container without flushing before exit. Added `provider.shutdown()`.

## Review Notes
The snippets are illustrative and still assume the referenced `traced-git-clone`, `traced-deploy`, and `/workspace/source/instrument_build.py` artifacts exist. The embedded Python snippets were checked with Python AST parsing for syntax correctness.
