# Validation Summary: How to Deploy ActiveMQ Artemis Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache ActiveMQ Artemis
- ArtemisCloud ActiveMQ Artemis Operator
- Kubernetes
- Flux CD GitRepository and Kustomization resources
- ActiveMQArtemis CRDs
- Broker properties, acceptors, address settings, and Jolokia

## Sources Consulted
- ArtemisCloud Operator documentation: https://artemiscloud.io/docs/help/operator/
- ArtemisCloud Operator GitHub repository and install manifests: https://github.com/artemiscloud/activemq-artemis-operator
- ActiveMQ Artemis Operator CRD schemas: https://raw.githubusercontent.com/artemiscloud/activemq-artemis-operator/1.2.8/config/crd/bases/broker.amq.io_activemqartemises.yaml and https://raw.githubusercontent.com/artemiscloud/activemq-artemis-operator/1.2.8/config/crd/bases/broker.amq.io_activemqartemisaddresses.yaml
- ActiveMQ Artemis address settings documentation: https://activemq.apache.org/components/artemis/documentation/latest/address-settings.html
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used a HelmRepository URL (`https://artemiscloud.io/helm-charts`) and a HelmRelease chart version (`1.0.28`) that did not resolve to an official Helm chart repository. Replaced the HelmRepository/HelmRelease flow with Flux GitRepository and Kustomization resources that apply the official ArtemisCloud operator manifest from the GitHub repository.
- The broker namespace did not match the default operator deployment namespace. Updated the examples to deploy broker resources in `activemq-artemis-operator`, matching the official operator manifest.
- `spec.clustered` and `spec.clusterProperties` were incorrect for the current `ActiveMQArtemis` CRD. Moved `clustered` under `spec.deploymentPlan` and removed unsupported `clusterProperties`.
- The post used `ActiveMQArtemisAddress` examples and an `activeMQArtemisInstance` field. The current CRD deprecates `ActiveMQArtemisAddress`, and `activeMQArtemisInstance` is not part of the current schema. Replaced address creation with supported `spec.brokerProperties` address and queue configuration.
- The address settings example used CRD-style `addressSettings` and `addressFullPolicy`. Replaced it with broker property keys including `addressSettings."#".addressFullMessagePolicy=PAGE`.
- The best-practice credential guidance referenced `adminPasswordSecret`, which is not a current CRD field. Updated it to use the documented `<broker-name>-credentials-secret` with `AMQ_USER` and `AMQ_PASSWORD`.
- The verification commands used the old namespace, console root URL, an unquoted password containing `!`, and a Jolokia `exec` path/property that did not match operator examples. Updated the namespace, console URL, quoting, and Jolokia `read` request with `MessageCount`.
- The introduction described OpenWire as "OpenWire (JMS)" and HA as live-backup pairs. Clarified OpenWire as a protocol and adjusted the operator capability wording to clustering and message migration.

## Review Notes
The guide now uses the operator's official plain manifest through Flux. In a production repository, it would be cleaner to store an explicit local `kustomization.yaml` for the broker directory and pin image digests or vetted operator tags according to the organization's upgrade policy.
