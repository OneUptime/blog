# Validation Summary: How to Implement HPA with Object Metrics for Queue-Based Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes autoscaling/v2 API
- Kubernetes custom metrics API
- Kubernetes CustomResourceDefinitions
- kubectl
- Redis queue depth metrics

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concept documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes Custom Metrics v1beta2 API reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- Kubernetes CustomResourceDefinition apiextensions.k8s.io/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/custom-resource-definition-v1/

## Issues Found
- The first HPA example placed `namespace: workers` under `spec.metrics[].object.describedObject`. `describedObject` is a `CrossVersionObjectReference`, which supports `apiVersion`, `kind`, and `name`, not `namespace`. Removed the invalid field and clarified that object metrics describe objects in the same namespace as the HPA.
- The introduction implied object metrics come directly from Kubernetes object data, including queue depth stored in ConfigMaps. Kubernetes object metrics describe an object and are supplied by the custom metrics API. Updated the wording to say queue depth is associated with a Service or custom resource.
- The Redis adapter section presented a non-standard adapter configuration as if it were a complete deployable metrics adapter. Updated the wording to call it a simplified custom metrics adapter configuration.
- The post used `custom.metrics.k8s.io/v1beta1` in raw metric API checks. The current Kubernetes external API reference lists Custom Metrics as `custom.metrics.k8s.io/v1beta2`, so the raw API paths were updated to `v1beta2`.
- The explanation for a `Value` target of 50 was imprecise. Updated it to explain that 50 is the target total backlog and that HPA scales up when the current metric is higher, subject to limits and policies.
- The CRD example used the misspelled plural `messagequeus` and CRD name `messagequeus.queue.example.com`. Corrected these to `messagequeues`.
- The CRD example told readers to update the custom resource's status from a controller but did not enable the CRD `/status` subresource. Added `subresources: status: {}` to the CRD version.

## Review Notes
- The HPA YAML snippets parse successfully as YAML after the edits.
- `kubectl` was not installed in the local environment, so command execution against a live cluster and local kubectl help output could not be verified.
- Queue depth can also be modeled as an external metric when it is not naturally associated with a Kubernetes object; the post remains valid because it deliberately associates the queue metric with a Service or custom resource for object-metric scaling.
