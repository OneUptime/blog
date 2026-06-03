# Validation Summary: How to Deploy Redpanda Operator for Kafka-Compatible Streaming on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redpanda
- Redpanda Operator
- Kubernetes
- Helm
- cert-manager
- Prometheus Operator ServiceMonitor
- Redpanda Console
- Go
- segmentio/kafka-go
- TLS and SASL/SCRAM

## Sources Consulted
- Redpanda Operator Helm Chart Specification: https://docs.redpanda.com/streaming/current/reference/k-operator-helm-spec/
- Redpanda Kubernetes CRD reference for cluster.redpanda.com/v1alpha2: https://docs.redpanda.com/streaming/current/reference/k-crd/
- Redpanda production deployment on Kubernetes: https://docs.redpanda.com/current/deploy/redpanda/kubernetes/k-production-deployment/
- Redpanda Helm Chart Specification: https://docs.redpanda.com/25.3/reference/k-redpanda-helm-spec/
- Redpanda Operator topic management: https://docs.redpanda.com/25.3/manage/kubernetes/k-manage-topics/
- Redpanda Console Kubernetes deployment and configuration docs: https://docs.redpanda.com/current/deploy/console/kubernetes/deploy/ and https://docs.redpanda.com/current/console/config/configure-console/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- kafka-go package documentation: https://pkg.go.dev/github.com/segmentio/kafka-go

## Issues Found
- The Redpanda, User, and Topic manifests used the older `cluster.redpanda.com/v1alpha1` API and obsolete top-level fields such as `spec.replicas`, `spec.version`, `spec.configuration`, `kafkaApi`, `adminApi`, and `pandaproxyApi`. Updated the examples to `cluster.redpanda.com/v1alpha2` and the current `spec.clusterSpec`/Helm-values schema.
- The operator install command pinned an old image tag through `--set image.tag=v2.15.0`. Updated the installation to use the current operator chart version, enable CRD installation, and include cert-manager because Redpanda's Kubernetes TLS support depends on it.
- Topic examples used `spec.config`; the current Topic CRD uses `spec.additionalConfig`. Updated both topic manifests and changed cluster references to `cluster.clusterRef`.
- User ACL examples used lowercase operation names and omitted ACL `type`. Updated ACL rules to use current operation names such as `Read`, `Write`, and `Describe`, and added `type: allow`.
- The application Deployment referenced Secrets from the `redpanda` namespace while running in an `applications` namespace. Changed the example Deployment namespace to `redpanda` so the referenced Secrets are available.
- The TLS certificate example generated a CN-only server certificate. Added SAN entries and `-copy_extensions copy` so modern TLS hostname verification can work.
- The Go producer created an empty TLS config and ignored the configured CA file. Updated it to load the CA certificate, build a `RootCAs` pool, and use the current direct `kafka.Writer` configuration instead of deprecated `kafka.NewWriter`/`WriterConfig`.
- The ServiceMonitor manifest used `apiVersion: v1`, which is invalid for Prometheus Operator ServiceMonitor resources. Updated it to `monitoring.coreos.com/v1`.
- The Redpanda Console example used an old image and did not mount the CA file referenced by TLS settings. Updated it to the current image path/version pattern, added `KAFKA_TLS_CAFILEPATH`, and mounted the TLS Secret.
- The scaling command patched the obsolete `spec.replicas` field. Updated it to patch `spec.clusterSpec.statefulset.replicas`.
- The Tiered Storage example used obsolete field names under `spec.configuration.cloudStorage`. Updated it to the current `spec.clusterSpec.storage.tiered` structure and Redpanda object storage property names.

## Review Notes
The corrected manifests follow the current Redpanda Operator schema, but they were not applied to a live Kubernetes cluster in this workspace. The Go producer snippet was checked against package documentation, but could not be compiled locally because the `go` binary is not installed.
