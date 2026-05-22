# Validation Summary: How to Configure Istio for Cassandra Connections

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Apache Cassandra
- Istio service mesh
- Kubernetes Services and StatefulSets
- Istio DestinationRule
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio ServiceEntry
- DataStax Astra secure connect bundle
- Prometheus/Istio TCP metrics

## Sources Consulted
- Apache Cassandra 4.1 cassandra.yaml configuration: https://cassandra.apache.org/doc/4.1/cassandra/configuration/cass_yaml_file.html
- Apache Cassandra FAQ, default ports: https://cassandra.apache.org/doc/stable/cassandra/overview/faq/index.html
- Docker Official Image for Cassandra, environment variables and storage path: https://hub.docker.com/_/cassandra
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- DataStax secure connect bundle documentation: https://docs.datastax.com/en/astra-db-classic/databases/secure-connect-bundle.html

## Issues Found
- The StatefulSet declared `volumeClaimTemplates` but did not mount the generated PVC into the Cassandra container. Added a `volumeMounts` entry for `cassandra-data` at `/var/lib/cassandra`, which is where the official Cassandra image writes data by default.
- The StatefulSet set `CASSANDRA_DC` and `CASSANDRA_RACK` without setting `CASSANDRA_ENDPOINT_SNITCH`. Added `CASSANDRA_ENDPOINT_SNITCH: GossipingPropertyFileSnitch` because the official Cassandra image documents that the DC and rack variables have no effect unless that snitch is used.
- The DataStax Astra example configured Istio TLS origination with `tls.mode: SIMPLE`. The Astra secure connect bundle already configures the driver-side TLS/mTLS connection, so Istio TLS origination would add an unintended extra TLS layer. Changed the ServiceEntry port to `protocol: TLS`/`name: tls-cql` and removed the DestinationRule TLS origination example.

## Review Notes
The remaining Istio and Kubernetes resource API versions and fields are current for the referenced Istio v1 APIs and Kubernetes StatefulSet/Service APIs. The examples still assume sidecar-mode Istio with Cassandra pods and client workloads enrolled in the mesh; deployments using Istio ambient mode, Cassandra operators, custom Cassandra images, or non-default Astra domains may need additional environment-specific configuration.
