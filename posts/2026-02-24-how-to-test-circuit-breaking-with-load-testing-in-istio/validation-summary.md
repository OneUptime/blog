# Validation Summary: How to Test Circuit Breaking with Load Testing in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy
- Fortio
- Kubernetes
- DestinationRule
- Circuit breaking and outlier detection

## Sources Consulted
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio httpbin sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/httpbin/httpbin.yaml
- Istio Fortio sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/httpbin/sample-client/fortio-deploy.yaml
- Fortio project documentation: https://github.com/fortio/fortio
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found
- The Fortio sample URL used `samples/httpbin/sample-client/fortio/fortio-deploy.yaml`, but the current Istio sample path is `samples/httpbin/sample-client/fortio-deploy.yaml`. I updated the deploy and cleanup commands.
- The post pinned Istio sample URLs to `release-1.20`, which is outdated relative to the current Istio documentation reviewed on 2026-05-21. I updated the sample URLs to `release-1.30`.
- The DestinationRule examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1`, so I updated the YAML examples.
- The commands used `kubectl exec deploy/fortio`, but the official Fortio sample creates a deployment named `fortio-deploy` with a `fortio` container. I updated the commands to `kubectl exec deploy/fortio-deploy -c fortio -- /usr/bin/fortio ...`.
- The Envoy stats examples used direct `curl localhost:15000/...` from the proxy container. Istio's circuit-breaking task uses `pilot-agent request GET ...` for proxy admin access, so I updated the stats and cluster inspection commands.
- The results section said traffic is shifted to healthy hosts with failing instances without noting that this requires multiple instances. I clarified that traffic shifts to healthy hosts when multiple instances exist.

## Review Notes
The post is technically relevant and validated after corrections. The Fortio sample manifest configures Istio proxy stat inclusion for `cluster.outbound`, which is important for the Envoy stat queries shown in the article.
