# Validation Summary: How to Set Up Ceph RBD Storage for NATS on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- Kubernetes (StorageClass, PVC, Helm deployments)
- NATS JetStream (persistent messaging)
- NATS Helm chart (nats/nats)
- NATS CLI (stream and consumer management)

## Sources Consulted
- NATS Helm chart values.yaml and templates from https://nats-io.github.io/k8s/helm/charts/ (chart version 2.12.6)
- NATS Helm chart source templates (nats-box deployment template, JetStream statefulset template)
- NATS CLI (natscli) source code for command and flag verification
- Rook-Ceph RBD CSI StorageClass documentation

## Issues Found

1. **Incorrect Helm value keys in extended JetStream configuration** (Section: "NATS JetStream Configuration"):
   - `config.jetstream.maxMemory: 1Gi` is not a valid chart key. Changed to `config.jetstream.memoryStore.maxSize: 1Gi` (with `memoryStore.enabled: true`).
   - `config.jetstream.maxFile: 40Gi` is not a valid chart key. Changed to `config.jetstream.fileStore.maxSize: 40Gi`.
   - `config.jetstream.domain: hub` is not a native chart value. Changed to `config.jetstream.merge.domain: hub`, which uses the chart's merge mechanism to inject the domain into the generated NATS server config.

2. **Incorrect nats-box pod reference in kubectl exec commands** (Sections: "Creating Persistent Streams", "Monitoring JetStream Storage"):
   - The blog used `kubectl exec -it nats-box` as if `nats-box` were a pod name. However, the NATS Helm chart deploys nats-box as a Deployment, so pods have hash suffixes (e.g., `nats-box-abc123-xyz`). Changed all occurrences to `kubectl exec -it deploy/nats-box` which correctly targets the Deployment.

## Review Notes
- The consumer creation command is labeled "Create a push consumer" but does not include `--deliver-subject`, which is required for push consumers. In the interactive nats-box shell, the NATS CLI would prompt for this missing value, so the command works in practice but is not fully non-interactive as presented. This is a minor labeling issue, not a functional error.
- The Ceph pool creation commands, StorageClass YAML, basic Helm values, NATS CLI stream/consumer commands, and monitoring commands are all technically correct.
- The summary section's explanation of JetStream replication on top of Ceph block replication is accurate.
