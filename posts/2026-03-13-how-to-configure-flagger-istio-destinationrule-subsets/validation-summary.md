# Validation Summary: How to Configure Flagger Istio DestinationRule Subsets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flagger Canary custom resource
- Istio DestinationRule
- Istio VirtualService routing
- Kubernetes Services and Deployments
- kubectl

## Sources Consulted
- Flagger documentation, How it works: https://docs.flagger.app/usage/how-it-works
- Flagger FAQ, Istio routing and mTLS examples: https://docs.flagger.app/faq
- Flagger Istio router source: https://github.com/fluxcd/flagger/blob/main/pkg/router/istio.go
- Flagger Canary CRD schema: https://github.com/fluxcd/flagger/blob/main/artifacts/flagger/crd.yaml
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/

## Issues Found
- The post incorrectly stated that Flagger creates one DestinationRule with `primary` and `canary` subsets. Current Flagger reconciles two DestinationRules, one for the primary service and one for the canary service, and the generated VirtualService routes to those service hosts. I updated the title, description, introductory language, generated YAML, inspection commands, and conclusion to describe the two-DestinationRule model.
- The generated DestinationRule example used `metadata.name: my-app`, `spec.host: my-app`, and `subsets` with label selectors. I replaced it with `my-app-primary` and `my-app-canary` DestinationRules, matching Flagger's official docs and router implementation.
- The inspection command used `kubectl get destinationrule my-app -o yaml`, which would inspect the apex name rather than the generated Flagger DestinationRules. I changed it to inspect `my-app-primary` and `my-app-canary`.

## Review Notes
- The `spec.service.trafficPolicy` field and the shown Istio fields (`connectionPool`, `outlierDetection`, `loadBalancer`, and `tls`) are valid in Flagger's Canary CRD and Istio's DestinationRule API.
- `consecutive5xxErrors` is the current Istio outlier detection field; the older `consecutiveErrors` field is not present in the current Istio reference.
- Istio's current reference examples use `networking.istio.io/v1`, while Flagger's client and examples continue to use the v1beta1 networking API type. The post's `networking.istio.io/v1beta1` DestinationRule examples remain valid for Flagger-oriented examples.
