# Validation Summary: How to Monitor Traffic Flow with Kiali Dashboard

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Kiali
- Istio
- Kubernetes
- Prometheus
- gRPC
- TCP traffic telemetry
- Istio VirtualService
- Kiali Operator CR

## Sources Consulted
- Kiali Topology documentation: https://kiali.io/docs/features/topology/
- Kiali Health documentation: https://kiali.io/docs/features/health/
- Kiali Traffic Health configuration: https://kiali.io/docs/configuration/health/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali Detail Views documentation: https://kiali.io/docs/features/details/
- Kiali Console Customization documentation: https://kiali.io/docs/configuration/console-customization/
- Kiali Graph FAQ: https://kiali.io/docs/faq/graph/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The Overview page description reflected an older namespace-card oriented view. Current Kiali documentation describes the Overview Dashboard as mesh health, infrastructure/config/control-plane/data-plane, application health, and service insights, so the Overview section was updated.
- The traffic animation section described red and green dots and said animation speed correlated with request rate. Kiali documents HTTP success as circles, errors as red diamonds, density as request rate, and speed as response time, so that wording was corrected.
- The edge label section described response time as average latency. Kiali documents Response Time edge labels as p95 response times on applicable edges, so the label description was corrected.
- The error color thresholds were presented as fixed yellow/red ranges. Kiali health depends on configured degraded and failure thresholds and uses orange/red health states, so the wording was made threshold-based.
- The `health_config` example used `degraded: 0.1`, but the current Kiali CR schema defines `degraded` and `failure` as integer percentage values. The example now uses `degraded: 1` and explains the integer requirement.
- The TCP section said TCP traffic is enabled in Display settings and included connection status as an edge value. Kiali documents TCP graph traffic selection through the Traffic dropdown with sent, received, or total byte-rate options, so that section was corrected.

## Review Notes
- The Istio `VirtualService` example uses the current `networking.istio.io/v1` API and valid weighted route syntax. A matching `DestinationRule` defining the `v1` and `v2` subsets is still required in a real deployment.
- Kiali UI labels and graph options can vary slightly by Kiali version and distribution, but the corrected descriptions match current upstream Kiali documentation.
