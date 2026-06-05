# Validation Summary: How to Configure the Kubernetes Objects Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Kubernetes Objects Receiver
- Kubernetes Attributes Processor
- Filter Processor
- Transform Processor and OTTL
- Kubernetes API resources, events, RBAC, and selectors

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes Objects Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8sobjectsreceiver
- OpenTelemetry Collector Contrib Kubernetes Objects Receiver metadata and implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sobjectsreceiver/metadata.yaml and https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sobjectsreceiver/unstructured_to_logdata.go
- OpenTelemetry Collector Contrib Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Contrib Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector Contrib Kubernetes Attributes Processor README and metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- Kubernetes label and field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/ and https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The examples used the deprecated receiver component type `k8sobjects`. Updated snippets to the current `k8s_objects` type.
- The examples used the deprecated Kubernetes Attributes Processor type `k8sattributes`. Updated snippets to the current `k8s_attributes` type.
- Watch-mode transform examples read Kubernetes object fields directly from `body`, but the receiver emits watch records with the Kubernetes object under `body["object"]` and the watch action under `body["type"]`. Updated event, pod, deployment, and node transform paths accordingly.
- The watch-mode example described `interval` as a resync setting, but the receiver documentation says `interval` applies only to pull-mode objects. Replaced that example with `include_initial_state` and removed watch-mode intervals from the production example.
- Several filter processor examples were written as keep predicates even though the filter processor drops records when a condition matches. Updated namespace, pod failure, scheduling, and noisy-event filters to drop the intended records.
- Pod failure and scheduling examples filtered on `event.reason` before setting that attribute. Added an event-field transform before the filters and updated pipeline order.
- The node condition example set readiness and pressure booleans without inspecting condition values. Changed it to preserve the raw node conditions list instead of deriving incorrect booleans.
- The namespace filtering snippet referenced an `otlp` exporter without defining it. Added the missing exporter block.
- The production example used `severity_text == nil` as the default severity check. Updated it to compare against the empty string, which matches the unset string field behavior.

## Review Notes
I did not run the corrected snippets through an OpenTelemetry Collector binary because no `otelcol` or `otelcol-contrib` executable was available in the local environment. The corrections were validated against the current official OpenTelemetry Collector Contrib documentation and source.
