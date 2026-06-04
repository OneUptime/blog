# Validation Summary: How to Configure LitmusChaos Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- LitmusChaos / Litmus ChaosCenter
- Litmus ChaosEngine, ChaosExperiment, ChaosResult, and probes
- Argo Workflows and CronWorkflow
- Prometheus scraping
- GitHub Actions

## Sources Consulted
- LitmusChaos ChaosCenter installation docs: https://docs.litmuschaos.io/docs/getting-started/installation
- LitmusChaos Resilience Probes docs: https://docs.litmuschaos.io/docs/concepts/probes
- LitmusChaos ChaosEngine state/runtime/application specifications: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-engine/engine-state/
- LitmusChaos pod-delete experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- LitmusChaos pod-network-latency experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-latency/
- LitmusChaos experiment FAQ for ChaosEngine and ChaosResult status fields: https://litmuschaos.github.io/litmus/experiments/faq/experiments/
- LitmusChaos chaos-exporter metrics docs: https://github.com/litmuschaos/chaos-exporter
- Argo Workflows resource template docs: https://argo-workflows.readthedocs.io/en/release-3.7/walk-through/kubernetes-resources/
- Argo Workflows field reference: https://argo-workflows.readthedocs.io/en/release-3.7/fields/
- GitHub Actions checkout action: https://github.com/actions/checkout

## Issues Found
- The installation section used outdated and broken manifest URLs. The portal manifest URLs returned 404, and the old ChaosHub `charts/generic/experiments.yaml` path returned a parsing error. Replaced the install flow with the official Helm chart flow and updated the ChaosHub experiment path to `faults/kubernetes/experiments.yaml`.
- The portal access command used the old frontend service name. Updated it to the Helm-installed `chaos-litmus-frontend-service`.
- The sample RBAC was missing permissions required by the documented pod-delete and pod-network-latency experiments, including events, pod logs, pod exec, configmaps, pod creation/update/deletecollection, daemonset reads, and job deletecollection. Expanded the Role to match the documented minimal permissions more closely.
- The ChaosEngine examples omitted runtime fields needed for the examples to run without annotating the target application. Added `engineState: active` and `annotationCheck: "false"`.
- The Argo Workflow resource templates waited on `status.experimentStatus`, which belongs to `ChaosResult`, not `ChaosEngine`. Changed the resource waits to `status.engineStatus == completed` and added explicit `ChaosResult` verdict checks so failed Litmus verdicts fail the workflow.
- The scheduled workflow embedded ChaosEngines did not specify a namespace. Added `namespace: default`.
- The GitHub Actions example used `actions/checkout@v2` and `kubectl wait --for=condition=Succeeded` for an Argo Workflow. Updated checkout to `v4` and changed the wait command to use the workflow `.status.phase` JSONPath.

## Review Notes
The post is now technically consistent with current LitmusChaos 3.x documentation. LitmusChaos still publishes some older 3.0.0 docs, but those docs are marked as no longer actively maintained; the install flow was updated to the current supported Helm-based guidance.
