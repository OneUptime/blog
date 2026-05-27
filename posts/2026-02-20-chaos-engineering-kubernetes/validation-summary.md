# Validation Summary: How to Practice Chaos Engineering on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Litmus Chaos / LitmusChaos
- Litmus ChaosEngine, ChaosExperiment, ChaosResult, and probes
- Helm
- Argo Workflows CronWorkflow
- YAML and kubectl

## Sources Consulted
- Litmus ChaosCenter installation docs: https://docs.litmuschaos.io/docs/getting-started/installation
- Litmus Chaos Charts repository installation instructions: https://github.com/litmuschaos/chaos-charts
- Litmus pod-delete experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- Litmus pod-network-latency experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-latency/
- Litmus pod-cpu-hog experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-cpu-hog/
- Litmus probe docs: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/litmus-probes/
- Litmus command probe docs: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/cmdProbe/
- Litmus chaos experiment and CronWorkflow docs: https://docs.litmuschaos.io/docs/concepts/chaos-workflow
- Argo Workflows CronWorkflow docs: https://argo-workflows.readthedocs.io/en/latest/cron-workflows/

## Issues Found
- The ChaosHub URL used to install generic experiments for Litmus 3.0.0 returned an error for the `charts/generic/experiments.yaml` path. Replaced it with the official Litmus chaos-charts release archive workflow that installs Kubernetes `experiments.yaml` files.
- The network section implied the shown experiment covered latency, packet loss, and DNS failures. Changed the wording to say the snippet simulates latency and that separate Litmus faults cover packet loss and DNS failures.
- The network latency comment said latency was added to all network traffic. Updated it to egress network traffic, matching the Litmus `pod-network-latency` behavior.
- The CPU hog example set both `CPU_CORES` to `2` and `CPU_LOAD` to `80`. Litmus requires `CPU_CORES` to be `0` when using `CPU_LOAD`, so the example now sets `CPU_CORES` to `0`.
- The command probe used `kubectl` without a source image. Added `litmuschaos/k8s:latest` as the command probe source image so the probe has `kubectl` available.
- The recurring CronWorkflow example used `litmus-checker` with unsupported `-name` and `-namespace` arguments. Replaced it with a raw ChaosEngine artifact and the documented `-file` and `-saveName` arguments, and added the `argo-chaos` service account used by Litmus CronWorkflow examples.

## Review Notes
The examples still assume that `litmus-admin` RBAC exists in the target environment, which is valid for ChaosCenter/agent-driven workflows but may require experiment-specific service accounts for standalone manual runs. The post now parses as YAML and aligns with the referenced Litmus and Argo documentation.
