# Validation Summary: How to Configure Istio for Function-as-a-Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Knative Serving
- Knative net-istio
- Kubernetes
- Serverless / Function-as-a-Service
- Prometheus metrics

## Sources Consulted
- Knative documentation: Installing Istio for Knative - https://knative.dev/docs/install/installing-istio/
- Knative documentation: Knative Serving installation files - https://knative.dev/docs/install/yaml-install/serving/serving-installation-files/
- Knative documentation: Configure Istio's ingress gateway - https://knative.dev/docs/serving/setting-up-custom-ingress-gateway/
- Knative documentation: Configuring scale to zero - https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative documentation: Installing Knative overview - https://knative.dev/docs/install/
- Istio documentation: VirtualService reference - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio documentation: DestinationRule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio documentation: PeerAuthentication reference - https://istio.io/latest/docs/reference/config/security/peer_authentication/

## Issues Found
- The post used Knative v1.13.0 installation URLs, which are outdated for a 2026 guide. Updated the Serving and net-istio manifest URLs to Knative v1.22.0 to match current Knative documentation.
- The prerequisites listed fixed Kubernetes and Istio minimum versions that are not reliable across current Knative, net-istio, and Istio release combinations. Updated them to require Kubernetes and Istio versions supported by the chosen component releases.
- The post described Knative as having only two main components. Updated the explanation to include Knative Functions as a CLI workflow while keeping the focus on Serving as the cluster component for request-driven serverless workloads.
- The `config-istio` custom gateway example used an incorrect flat key, `gateway.knative-serving.knative-ingress-gateway`. Updated it to the documented `external-gateways` YAML block.
- The Istio custom resources used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated the examples to the current `networking.istio.io/v1` and `security.istio.io/v1` API versions used in current Istio documentation.
- The scale-to-zero timeout section said to edit mesh config, but the example is a `VirtualService`, not Istio mesh config. Updated the wording to say create or update a VirtualService timeout for mesh-internal calls.
- The mTLS section implied functions automatically get strict mTLS with no Knative-specific preparation. Updated it to include the documented Knative `knative-serving` namespace preparation and permissive PeerAuthentication before applying strict mTLS in the workload namespace.

## Review Notes
- The post remains a high-level tutorial. The traffic policy examples are valid Istio resources, but users should be aware that Knative also reconciles its own routing resources for ingress traffic.
- The `scale-to-zero-grace-period` setting is valid, but Knative documents it as an internal network-programming grace period, not a way to keep the last replica alive after traffic stops.
