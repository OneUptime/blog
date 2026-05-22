# Validation Summary: How to Configure Istio for MongoDB Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management resources: ServiceEntry, DestinationRule, VirtualService, Sidecar
- Istio security resources: AuthorizationPolicy and mTLS
- Kubernetes Deployment, Service, headless Service, and StatefulSet
- MongoDB wire protocol, replica sets, and Atlas connection strings
- Prometheus metrics for Istio TCP telemetry

## Sources Consulted
- Istio Protocol Selection — https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference — https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference — https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference — https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Egress Wildcard Hosts task — https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Istio Standard Metrics reference — https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Service documentation — https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- MongoDB Wire Protocol documentation — https://www.mongodb.com/docs/current/reference/mongodb-wire-protocol/
- MongoDB Connection String documentation — https://www.mongodb.com/docs/current/reference/connection-string/
- MongoDB Replica Set Configuration reference — https://www.mongodb.com/docs/manual/reference/replica-configuration/

## Issues Found
- The post said `mongo` was a generally recognized Istio port name. Istio documents Mongo protocol handling as experimental and feature-flagged, so this was changed to recommend `tcp-` for opaque TCP handling.
- The post described `maxConnections` as something that should account for all application instances globally. Istio applies connection pool settings to upstream hosts from the proxy enforcing the rule, so the wording now scopes the limit to each client-side proxy and MongoDB member.
- The MongoDB Atlas ServiceEntry used `protocol: TCP` and then recommended `tls.mode: SIMPLE`. Atlas `mongodb+srv://` connection strings already enable TLS in the MongoDB driver, so the ServiceEntry now uses `protocol: TLS` and the text warns not to add Istio TLS origination for driver-encrypted traffic.
- The post implied Istio handles SRV DNS resolution for Atlas. The wording now clarifies that the MongoDB driver performs SRV/TXT lookups and that ServiceEntry must cover the resulting hostnames.
- The post incorrectly called MongoDB a server-first protocol like MySQL. MongoDB's wire protocol is request-response over TCP, so the section was corrected to discuss Istio protocol sniffing rather than server-first behavior.
- The proxy-config guidance referred to `tcpProxy` and `httpConnectionManager`. The text now uses the current Envoy filter names: `envoy.filters.network.tcp_proxy` and `envoy.filters.network.http_connection_manager`.

## Review Notes
- The Kubernetes and Istio resource API versions used in the examples are current.
- The example StatefulSet omits persistent volume claims and replica set initialization steps; that is acceptable for this post because the section is focused on Istio networking rather than a production MongoDB deployment.
- The Prometheus metric names and `destination_service` label are valid Istio standard telemetry fields.
