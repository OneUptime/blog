# Validation Summary: How to Deploy Knative Services with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- Knative Serving
- Knative Eventing
- Knative Operator
- Helm
- Kustomize

## Sources Consulted
- Knative Operator installation documentation: https://knative.dev/docs/install/operator/knative-with-operators/
- Knative Serving Operator CR documentation: https://knative.dev/docs/install/operator/configuring-serving-cr/
- Knative Eventing Operator CR documentation: https://knative.dev/docs/install/operator/configuring-eventing-cr/
- Knative Operator Helm chart repository: https://knative.github.io/operator/index.yaml
- Knative Serving traffic management documentation: https://knative.dev/docs/serving/traffic-management/
- Knative Serving autoscaling documentation: https://knative.dev/docs/serving/autoscaling/
- Knative scale-to-zero documentation: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative Channel based Broker documentation: https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/
- Knative Trigger documentation: https://knative.dev/v1.21-docs/eventing/triggers/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post created a `HelmRepository` for the Knative Operator but did not define a `HelmRelease`, so the Operator and its CRDs would not be installed before applying `KnativeServing` and `KnativeEventing` resources. Added a Flux `HelmRelease` for the official `knative-operator` chart.
- The examples pinned Knative Serving and Eventing to `1.14.0`, which is outside the current Knative Operator v1.22 supported version set. Updated the examples to `1.22.0` and the Operator chart to `v1.22.1`.
- The Knative Serving and Eventing CR examples assumed the `knative-serving` and `knative-eventing` namespaces already existed. Added namespace manifests to the examples so the resources can be applied cleanly.
- The Broker example referenced `config-br-defaults` in `spec.config`. For a specific MTChannelBasedBroker configuration, the Broker should reference a ConfigMap containing a `channel-template-spec`, such as the default `config-br-default-channel`. Updated the reference.
- The canary traffic example added a tagged target without a `percent` value. Knative examples use `percent: 0` for tag-only access to a revision. Added `percent: 0`.
- The Flux Kustomization used `wait: true` together with `healthChecks`, but Flux ignores `healthChecks` when `wait` is true. Removed `wait: true` so the explicit health check is effective.
- The prerequisite `Kubernetes cluster v1.26 or later` was too specific and may be wrong for newer Knative releases. Reworded it to require a Kubernetes version supported by the chosen Knative release.

## Review Notes
The remaining examples use current stable Knative API groups (`serving.knative.dev/v1`, `eventing.knative.dev/v1`, and `operator.knative.dev/v1beta1`) and current Flux API groups (`source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1`). The trigger examples use the legacy `filter.attributes` field, which is still documented for backward compatibility; future posts could prefer the newer `filters` field where appropriate.
