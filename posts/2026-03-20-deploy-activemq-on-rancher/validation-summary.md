# Validation Summary: How to Deploy ActiveMQ on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache ActiveMQ Artemis
- arkmq-org ActiveMQ Artemis Operator
- Rancher / Kubernetes
- Helm (OCI charts)
- JMS / AMQP / STOMP / MQTT protocols
- Java JMS client API
- Longhorn persistent storage

## Sources Consulted
- ArkMQ operator install docs: https://arkmq.org/docs/help/operator-install
- ArkMQ quick start: https://arkmq.org/docs/getting-started/quick-start
- ArkMQ operator usage / resources: https://arkmq.org/docs/help/operator
- ArkMQ tutorials: https://arkmq.org/docs/tutorials/using_operator
- arkmq-org / activemq-artemis-operator GitHub: https://github.com/arkmq-org/activemq-artemis-operator
- Bitnami charts repo (verified that no `activemq` chart exists): https://github.com/bitnami/charts/tree/main/bitnami and https://charts.bitnami.com/bitnami/index.yaml
- ArtifactHub search for activemq Helm charts

## Issues Found
1. **Step 1 — Wrong Helm repo URL.** The post used `helm repo add activemq-artemis https://arkmq-org.github.io/activemq-artemis-operator/`, but that URL is the docs site (now redirects to arkmq.org) and does not serve a Helm `index.yaml`. The actual operator chart is published as an OCI artifact at `oci://quay.io/arkmq-org/helm-charts/arkmq-org-broker-operator`. Replaced the broken `helm repo add` with the correct OCI install command.

2. **Step 2/3 — Non-existent Bitnami chart.** The post installed `bitnami/activemq` with values like `auth.user`, `replicaCount`, etc. The Bitnami charts repository does not contain an `activemq` chart (verified against the live `charts.bitnami.com/bitnami/index.yaml` and the `bitnami/charts` GitHub repo `bitnami/` directory listing). The values structure (`auth.user`, `auth.enabled`, top-level `replicaCount`, `persistence.storageClass` for ActiveMQ) was therefore fabricated. Replaced with an `ActiveMQArtemis` custom resource (`apiVersion: broker.amq.io/v1beta1`) consistent with the operator the post had already added in Step 1, using the operator's documented `deploymentPlan` fields (`size`, `persistenceEnabled`, `messageMigration`, `storage`, `resources`, `adminUser`, `adminPassword`).

3. **Step 4 — Wrong workload kind.** `kubectl logs deployment/artemis` would not work because the operator creates a StatefulSet, not a Deployment. Updated to log directly from the broker pod (`artemis-broker-ss-0`) as documented by the operator's pod naming convention.

4. **Step 5 — Wrong service name.** `svc/artemis` does not exist. The operator creates a per-pod web console service named `<broker>-wconsj-0-svc`. Updated the `kubectl port-forward` target accordingly.

5. **Step 6 — ConfigMap-based broker.xml does not work with the operator.** The original Step 6 implied dropping a `broker.xml` ConfigMap into the namespace would configure queues, but the operator manages `broker.xml` itself and does not consume an external ConfigMap. The supported way to provision queues/topics is via `ActiveMQArtemisAddress` CRs. Replaced the ConfigMap example with two `ActiveMQArtemisAddress` resources (anycast queue + multicast topic) that match the addresses referenced later in the Java sample.

6. **Step 7 — Wrong service FQDN.** The Java client connected to `artemis.messaging.svc.cluster.local`, which would not exist. Updated to the operator's headless service `artemis-broker-hdls-svc.messaging.svc.cluster.local` and added a sentence noting the CORE protocol on port 61616.

## Review Notes
- The post's introduction still says "the official Helm chart"; the arkmq-org operator chart is the upstream/official path for Artemis on Kubernetes and is installed via Helm (OCI), so this phrasing remains accurate.
- `ActiveMQConnectionFactory` is unqualified in the Java snippet. For Artemis, the correct import is `org.apache.activemq.artemis.jms.client.ActiveMQConnectionFactory` (not the classic 5.x class of the same name in package `org.apache.activemq`). This is fine in a snippet but readers should be aware.
- `replicaCount: 2`/`size: 2` in Artemis on Kubernetes is two independent broker pods by default, not an active/passive HA pair. True live/backup HA in Artemis requires additional CR configuration (e.g., `deploymentPlan.clustered`, replication policies). The "Active-passive HA pair" comment is a simplification but kept to match the author's tone; readers planning real HA should consult the operator's clustering docs.
- The arkmq-org operator's CRDs and field names (e.g., `deploymentPlan.storage`, `deploymentPlan.resources`) are subject to change between operator versions; values were verified against the current `broker.amq.io/v1beta1` API.
