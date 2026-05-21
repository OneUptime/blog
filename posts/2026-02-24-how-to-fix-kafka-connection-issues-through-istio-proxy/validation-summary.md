# Validation Summary: How to Fix Kafka Connection Issues Through Istio Proxy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Istio
- Envoy sidecar proxy
- Kubernetes Services and StatefulSets
- Istio DestinationRule and ServiceEntry resources
- Istio mTLS and TCP routing

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Apache Kafka broker configuration documentation: https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka consumer configuration documentation: https://kafka.apache.org/42/configuration/consumer-configs/

## Issues Found
- The port naming section overstated that Envoy would reject all Kafka traffic when a port is named with an HTTP prefix. Updated the wording to the technically accurate behavior: Envoy treats the port as HTTP, which can break Kafka's binary protocol.
- The DNS troubleshooting command executed `nslookup` from the `istio-proxy` container. Updated it to run from the application container, which better reflects the client-side DNS behavior being tested.
- The mTLS section incorrectly implied that Kafka SSL/TLS and Istio mTLS inherently conflict. Updated it to explain that Kafka TLS can run inside Istio mTLS when both endpoints have sidecars, while noting that operators may choose Kafka PLAINTEXT if Istio is handling in-mesh encryption.
- The Envoy stats commands used `curl` against port 15000 from the proxy container. Updated them to the documented `pilot-agent request GET stats` command.
- The external Kafka ServiceEntry example used `resolution: DNS` with a wildcard host for raw TCP traffic. Updated it to use concrete broker hostnames and added a note that wildcard DNS resolution is not compatible with raw TCP traffic in Istio.
- The external Kafka TLS guidance implied that a DestinationRule with `tls.mode: SIMPLE` should always be used when the external Kafka service uses TLS. Updated it to distinguish Envoy TLS origination from Kafka clients that already establish their own SSL/TLS connection.

## Review Notes
The remaining examples are intentionally generic and still need environment-specific values such as real Kafka broker hostnames, namespaces, selectors, and connection limits. The Istio API examples use a mix of `networking.istio.io/v1beta1` and `networking.istio.io/v1`; current Istio documentation uses `v1` for these resources, but `v1beta1` remains commonly supported in existing clusters.
