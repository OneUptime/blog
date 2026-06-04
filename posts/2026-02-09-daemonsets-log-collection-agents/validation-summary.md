# Validation Summary: How to Use DaemonSets for Log Collection Agents on Every Node

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes logging architecture
- Fluentd
- Filebeat
- Grafana Loki
- Promtail
- Elasticsearch
- Prometheus alerting rules

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Elastic Filebeat Kubernetes documentation: https://www.elastic.co/docs/reference/beats/filebeat/running-on-kubernetes
- Elastic Filebeat container input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-container
- Elastic Filebeat multiline examples: https://www.elastic.co/docs/reference/beats/filebeat/multiline-examples
- Fluentd tail input documentation: https://docs.fluentd.org/input/tail
- Fluentd parse section documentation: https://docs.fluentd.org/configuration/parse-section
- Fluentd multiline parser documentation: https://docs.fluentd.org/parser/multiline
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/

## Issues Found
- The logging architecture description said the container runtime writes logs to `/var/log/containers`. Updated it to match Kubernetes documentation: kubelet directs runtimes to write pod logs under `/var/log/pods`, with active container log symlinks under `/var/log/containers`.
- The Fluentd example parsed Kubernetes container logs as JSON. Updated the parser to a CRI-compatible regular expression using Fluentd's built-in `regexp` parser and `%iso8601` time parsing.
- The Fluentd, Filebeat, and Promtail DaemonSet examples relied on `/var/lib/docker/containers`, which is Docker-specific and not appropriate for current general Kubernetes clusters. Removed Docker-specific mounts and used `/var/log` or `/var/log/pods` paths.
- The Filebeat example used the deprecated `container` input. Updated it to the supported `filestream` input with the container parser, fingerprint file identity, and `/var/log/pods` metadata matching.
- The Filebeat DaemonSet referenced a `filebeat` service account without defining the required ServiceAccount and RBAC objects. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources.
- The Filebeat multiline snippet used deprecated input-style multiline keys after switching to `filestream`. Updated it to use the `multiline` parser under `parsers`.
- The Promtail section presented Promtail as a current deployment choice. Updated the text to note that Promtail is EOL as of March 2, 2026 and should only be used for legacy clusters.
- The Promtail DaemonSet referenced a `promtail` service account without defining RBAC. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources needed for Kubernetes service discovery.
- The Promtail configuration stored positions in `/tmp` even though the pod mounted `/run/promtail`. Updated positions storage to `/run/promtail/positions.yaml` and made the hostPath directory creatable.
- The Promtail configuration discovered all pods from every DaemonSet pod. Added a node-name `keep` relabel rule so each Promtail instance only scrapes pods scheduled on its own node.
- Several Fluentd configuration snippets were marked as YAML code blocks even though they were Fluentd config. Updated those code fences to `conf`.

## Review Notes
The examples assume the `logging` namespace, Elasticsearch credentials secret, Elasticsearch service, Loki service, and any collector-specific plugins/images already exist. Promtail is retained only as a legacy example; new Loki deployments should use Grafana Alloy or another supported Loki client.
