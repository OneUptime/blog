# Validation Summary: How to Set Up Flagger with Knative Serving

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Knative Serving
- Kubernetes
- Helm
- Prometheus
- Istio, Kourier, and Contour networking
- Canary deployments and traffic splitting

## Sources Consulted
- Flagger Knative Canary Deployments: https://docs.flagger.app/main/tutorials/knative-progressive-delivery
- Flagger Canary CRD: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger Webhooks and Load Tester: https://docs.flagger.app/main/usage/webhooks
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Knative Serving YAML installation: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Traffic Management: https://knative.dev/docs/serving/traffic-management/
- Knative Serving API reference: https://knative.dev/docs/serving/reference/serving-api/
- Knative Autoscaling Scale Bounds: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative Pod Autoscaler configuration: https://knative.dev/docs/serving/autoscaling/kpa-specific/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The Knative autoscaling annotations used the old camelCase forms `autoscaling.knative.dev/minScale` and `autoscaling.knative.dev/maxScale`. Updated them to the current documented annotation keys `autoscaling.knative.dev/min-scale` and `autoscaling.knative.dev/max-scale`.
- The Flagger Canary examples omitted `spec.provider: knative`. Added it to both Canary manifests because Flagger's Knative documentation describes Knative canaries as Canary resources with `.spec.provider` set to `knative`.
- The Knative Service patch command targeted `service podinfo`, which can resolve to the core Kubernetes Service resource instead of the Knative Service, and used a merge patch that would replace the container list and drop fields like ports. Updated it to patch `services.serving.knative.dev podinfo` with a JSON patch that changes only `/spec/template/spec/containers/0/image`.
- The load tester webhooks that run `hey` commands omitted `metadata.type: cmd`. Added `type: cmd` so the Flagger load tester interprets the command correctly.

## Review Notes
The local environment did not have `helm` or `kubectl` installed, so CLI behavior was verified against official documentation and the current Flagger CRD rather than by executing the commands locally.
