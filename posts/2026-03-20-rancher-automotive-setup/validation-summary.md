# Validation Summary: How to Set Up Rancher for Automotive

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- RKE2
- K3s
- Kubernetes Deployments and Jobs
- Strimzi for Apache Kafka
- Prometheus Operator

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Fleet GitRepo targeting documentation: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet GitRepo creation documentation: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/v2.10/integrations-in-rancher/fleet/overview
- K3s documentation: https://docs.k3s.io/
- RKE2 high availability documentation: https://docs.rke2.io/install/ha
- Strimzi deployment documentation: https://strimzi.io/docs/operators/latest/full/deploying
- Strimzi API/configuration documentation: https://strimzi.io/docs/operators/latest/configuring.html
- Official Strimzi example for current KRaft deployment shape: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/kafka/kafka-with-dual-role-nodes.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Kafka example used the older `kafka.strimzi.io/v1beta2` API and a ZooKeeper-based Strimzi layout. Current Strimzi documentation uses the `kafka.strimzi.io/v1` API, and ZooKeeper-based clusters were removed starting with Strimzi 0.46. I replaced the snippet with a current KRaft-based `KafkaNodePool` plus `Kafka` example.
- Every `apps/v1` `Deployment` example was missing the required `spec.selector` field and matching pod-template labels. I added selectors and corresponding `template.metadata.labels` entries to all Deployment snippets so they match Kubernetes `apps/v1` requirements.
- The OTA packaging `Job` pod template omitted `restartPolicy`, and the shell command referenced an undefined `SIGNING_KEY` variable. I added `restartPolicy: OnFailure` and wired the job to the existing `ota-credentials` secret via `SIGNING_KEY_ARN`.

## Review Notes
- The OTA packaging commands and internal container images appear to be organization-specific examples rather than publicly documented Rancher or Kubernetes tooling. The Kubernetes `Job` wrapper was validated and corrected, but the internal command implementations themselves are not publicly verifiable.
- The Prometheus alert rules use application-specific metric names. The `PrometheusRule` resource shape is valid, but those metrics must exist in the deployed workloads for the rules to function.
- The Strimzi example now pins Kafka `4.2.0` and `metadataVersion: 4.2-IV1` to match the current official example shape reviewed on 2026-04-24.
