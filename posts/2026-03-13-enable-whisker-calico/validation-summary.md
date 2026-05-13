# Validation Summary: How to Enable Whisker in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico Whisker
- Goldmane flow logs API
- Tigera Operator resources
- Kubernetes kubectl
- Calico FelixConfiguration

## Sources Consulted
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: View flow logs in the Calico Whisker web console: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source installation API reference for Goldmane and Whisker resources: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Cloud FelixConfiguration reference for file-based flow log aggregation fields: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud flow log aggregation documentation: https://docs.tigera.io/calico-cloud/visibility/elastic/flow/aggregation
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post incorrectly stated that Whisker is not available in open-source Calico. Current Calico Open Source documentation says Goldmane and Whisker are available as tech-preview observability components and are enabled by default in new Calico Open Source 3.30+ installations. I updated the prerequisites and introduction accordingly.
- The enablement example used a non-documented `Installation.spec.whisker.enabled` field. Current documentation enables flow logs with separate `operator.tigera.io/v1` `Goldmane` and `Whisker` custom resources. I replaced the YAML and commands with those resources.
- The post implied Whisker directly shows individual pod-to-pod connections. Official documentation describes Whisker flow logs as aggregated connection data, not every individual connection. I changed the wording to "aggregated flow logs" and updated the architecture diagram labels.
- The verification step used a likely brittle `app=whisker` log selector. I replaced that with checks for Goldmane and Whisker pods, the Whisker service, and Tigera operator component status.
- The flow-log aggregation example was presented generically. The aggregation fields shown are documented for Calico Cloud / Calico Enterprise file-based flow logs, so I labeled the snippet accordingly.

## Review Notes
The Calico Open Source Whisker and Goldmane documentation marks the feature as tech preview, so behavior and resource details may change before general availability. The post is now technically consistent with current Calico documentation.
