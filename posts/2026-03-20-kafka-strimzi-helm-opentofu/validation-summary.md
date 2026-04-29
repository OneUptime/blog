# Validation Summary: How to Deploy Apache Kafka with Strimzi on Kubernetes using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Strimzi
- Kubernetes
- OpenTofu / Terraform-compatible providers
- Helm
- Kafka ACLs and mTLS authentication
- Strimzi CRDs (`Kafka`, `KafkaNodePool`, `KafkaTopic`, `KafkaUser`)

## Sources Consulted
- Strimzi 0.39.0 Deploying and Managing Guide: https://strimzi.io/docs/operators/0.39.0/full/deploying
- Strimzi 0.39.0 Configuration Reference: https://strimzi.io/docs/operators/0.39.0/configuring.html
- Strimzi 0.39.0 Helm chart values: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/0.39.0/packaging/helm-charts/helm3/strimzi-kafka-operator/values.yaml
- Strimzi 0.39.0 Helm deployment template: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/0.39.0/packaging/helm-charts/helm3/strimzi-kafka-operator/templates/060-Deployment-strimzi-cluster-operator.yaml
- Strimzi 0.39.0 watched-namespace RoleBinding template: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/0.39.0/packaging/helm-charts/helm3/strimzi-kafka-operator/templates/023-RoleBinding-strimzi-cluster-operator.yaml
- Strimzi 0.39.0 KRaft node pool example: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/0.39.0/examples/kafka/nodepools/kafka-with-dual-role-kraft-nodes.yaml
- HashiCorp Kubernetes provider `kubernetes_manifest` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- HashiCorp tutorial on managing Kubernetes custom resources: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-crd-faas
- Apache Kafka 3.6 security overview: https://kafka.apache.org/36/security/security-overview/
- Apache Kafka 3.6 ACL operation reference: https://kafka.apache.org/36/javadoc/org/apache/kafka/common/acl/AclOperation.html
- Apache Kafka 3.6 authorization and ACLs: https://kafka.apache.org/36/security/authorization-and-acls/

## Issues Found
1. The description overstated Strimzi 0.39 KRaft as production-grade. In Strimzi 0.39, `UseKRaft` was still a feature gate intended for development use, so the wording was corrected to describe it as feature-gated KRaft.
2. The Helm chart example omitted the required `+UseKRaft` feature gate and used `watchNamespaces` incorrectly. The chart automatically includes the release namespace, so listing `kafka` there can create duplicate watched-namespace RoleBindings.
3. The KRaft cluster example did not match Strimzi 0.39’s documented API. A valid 0.39 KRaft deployment requires `KafkaNodePool` resources plus `strimzi.io/node-pools` and `strimzi.io/kraft` annotations on the `Kafka` resource.
4. The original KRaft example omitted `metadataVersion` and the schema-placeholder fields still required by the 0.39 CRDs. The post was updated to include the required `replicas`, `storage`, and `zookeeper` fields, with notes that some are ignored at runtime in KRaft mode.
5. The post implied the Strimzi CRDs and the custom resources could be planned in one step with `kubernetes_manifest`. The text was corrected to make the apply order explicit: install the operator and CRDs first, then plan and apply the Strimzi custom resources.
6. The TLS user example could not work as written because the Kafka listeners were encrypted with TLS but not configured for mTLS authentication, and the Kafka cluster lacked `simple` authorization. Listener authentication and broker authorization were added.
7. The `metricsConfig` block referenced a `kafka-metrics` ConfigMap that the post never created. It was removed so the example remains self-contained.
8. The `KafkaUser` ACL example used the deprecated singular `operation` field and gave the cluster resource a name. It was updated to use `operations` arrays and a valid unnamed cluster resource.

## Review Notes
- The post is now technically correct for Strimzi `0.39.0` and Kafka `3.6.1`, but it is intentionally version-pinned. Newer Strimzi releases changed KRaft maturity and setup requirements, so the same deployment can be simpler on later versions.
- The `gp3` storage class is AWS-specific. Readers on other Kubernetes platforms need to substitute a storage class available in their cluster.
- The examples assume the Kubernetes cluster itself already exists and is reachable by the Helm and Kubernetes providers at plan time.
