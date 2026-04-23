# Validation Summary: How to Deploy ActiveMQ on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Rancher
- Kubernetes
- Apache ActiveMQ Artemis
- ArkMQ Broker Operator
- Helm
- Prometheus Operator / ServiceMonitor

## Sources Consulted
- ArkMQ Quick Start: https://arkmq.org/docs/getting-started/quick-start/
- ArkMQ Operator documentation: https://arkmq.org/docs/help/operator/
- ArkMQ operator tutorial using the current `Broker` API: https://github.com/arkmq-org/activemq-artemis-operator/blob/main/docs/tutorials/send_receive_ingress.md
- ArkMQ broker CRD and deprecation warning for `ActiveMQArtemis`: https://github.com/arkmq-org/activemq-artemis-operator/blob/main/config/crd/bases/broker.amq.io_activemqartemises.yaml
- ArkMQ security CRD deprecation warning: https://github.com/arkmq-org/activemq-artemis-operator/blob/main/config/crd/bases/broker.amq.io_activemqartemissecurities.yaml
- ArkMQ address CRD deprecation warning: https://github.com/arkmq-org/activemq-artemis-operator/blob/main/config/crd/bases/broker.amq.io_activemqartemisaddresses.yaml
- ArkMQ operator service port definitions: https://github.com/arkmq-org/activemq-artemis-operator/blob/main/pkg/resources/serviceports/service_port.go
- Apache ActiveMQ Artemis configuration reference: https://artemis.apache.org/components/artemis/documentation/latest/configuration-index.html
- Apache ActiveMQ Artemis authentication and authorization docs: https://artemis.apache.org/components/artemis/documentation/latest/security.html
- Apache ActiveMQ Artemis CLI source for `browser` and destination syntax: https://github.com/apache/activemq-artemis/blob/main/artemis-cli/src/main/java/org/apache/activemq/artemis/cli/commands/messages/Browse.java
- Apache ActiveMQ Artemis CLI destination parsing: https://github.com/apache/activemq-artemis/blob/main/artemis-cli/src/main/java/org/apache/activemq/artemis/cli/commands/messages/DestAbstract.java
- Rancher ServiceMonitor and PodMonitor configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors

## Issues Found
- The operator installation section used the archived `artemiscloud.io` Helm repository. I updated it to the current ArkMQ OCI Helm chart and corrected the Helm version requirement to `3.8+`.
- The broker example used the deprecated `broker.amq.io/v1beta1` `ActiveMQArtemis` API. I migrated it to the current `broker.arkmq.org/v1beta2` `Broker` API.
- The broker example used the deprecated `addressSettings` CR field. I replaced it with `brokerProperties`, which is the supported configuration path.
- The security example used the deprecated `ActiveMQArtemisSecurity` CRD. I replaced it with the supported `-jaas-config` secret plus broker-properties secret mounted through `deploymentPlan.extraMounts.secrets`.
- The queue/topic example used the deprecated `ActiveMQArtemisAddress` CRD. I replaced it with broker-properties mounted from a `-bp` secret.
- The broker manifest declared a custom `core` acceptor on port `61616`, which conflicts with the operator-managed internal listener. I removed that acceptor and kept the protocol-specific acceptors that do not collide.
- The console and metrics sections used incorrect generated resource names and labels. I fixed the console service name to `activemq-prod-wconsj-0-svc`, changed the ServiceMonitor selector to `application: activemq-prod-app`, and changed the metrics port to `console-jolokia`.
- The monitoring example did not enable all required broker settings for metrics. I enabled `console.expose: true` and `deploymentPlan.enableMetricsPlugin: true` in the broker spec.
- The application config used `orders` even though the defined queue is `orders.processor`. I corrected the queue name.
- The application connection URIs embedded a password containing `@` without URL-encoding it. I percent-encoded the password in the sample URIs.
- The troubleshooting section used the wrong CLI path, the wrong command name (`browse` instead of `browser`), and the wrong data directory path. I corrected all three to match the current broker image and CLI.
- The wording around “high availability” overstated what this specific clustered example configures. I adjusted the wording to clustering and persistence.

## Review Notes
- ArkMQ documentation still contains some `broker.amq.io/v1beta1` examples, but the shipped CRDs now mark `ActiveMQArtemis`, `ActiveMQArtemisSecurity`, and `ActiveMQArtemisAddress` as deprecated. The post was updated to the current non-deprecated `Broker` API and supported replacement patterns.
- The `release: rancher-monitoring` label in the `ServiceMonitor` assumes the default Rancher Monitoring Helm release name. Clusters installed with a custom release name may need to adjust that label or their Prometheus selectors.
