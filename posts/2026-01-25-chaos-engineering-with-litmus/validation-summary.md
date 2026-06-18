# Validation Summary: How to Configure Chaos Engineering with Litmus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LitmusChaos
- Kubernetes
- Helm
- Argo Workflows
- GitHub Actions
- Prometheus metrics

## Sources Consulted
- LitmusChaos ChaosCenter installation docs: https://docs.litmuschaos.io/docs/getting-started/installation
- LitmusChaos construct chaos experiment docs: https://docs.litmuschaos.io/docs/user-guides/construct-experiment
- LitmusChaos experiment FAQ: https://litmuschaos.github.io/litmus/experiments/faq/experiments/
- Litmus Helm chart for Kubernetes chaos experiments: https://github.com/litmuschaos/litmus-helm/tree/master/charts/kubernetes-chaos
- LitmusChaos Kubernetes chaos templates for pod-delete, pod-network-latency, pod-cpu-hog, pod-memory-hog, and disk-fill: https://github.com/litmuschaos/litmus-helm/tree/master/charts/kubernetes-chaos/templates
- LitmusChaos Prometheus integration docs: https://docs.litmuschaos.io/docs/integrations/prometheus
- Argo Workflows Kubernetes resource template docs: https://argo-workflows.readthedocs.io/en/latest/walk-through/kubernetes-resources/
- GitHub Actions workflow commands docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

## Issues Found
- The ChaosExperiment installation command used `https://hub.litmuschaos.io/api/chaos/3.0.0?file=charts/generic/experiments.yaml`, which no longer returns a usable experiment manifest. Replaced it with the maintained `litmuschaos/kubernetes-chaos` Helm chart.
- The post installed ChaosExperiment resources in `litmus` while the sample ChaosEngines were created in `default`. Litmus expects the ChaosEngine and ChaosExperiment resources to exist in the same namespace, so the install and list commands now use `default`.
- The sample `litmus-admin` ClusterRole did not grant access to `batch/jobs`, which the official Litmus experiment templates require for running experiment jobs. Added the missing `jobs` permissions.
- The disk-fill example described `EPHEMERAL_STORAGE_MEBIBYTES` as a path. In the Litmus template it represents the ephemeral storage size in MiB, so the comment was corrected.
- The Argo Workflow `run-chaos` template mounted a non-existent `chaos-config` volume and did not use the `experiment` parameter to create a ChaosEngine. Replaced it with an Argo resource template that creates a parameterized ChaosEngine manifest.
- The GitHub Actions kubeconfig setup exported `KUBECONFIG` only inside one step, so later steps would not see it. Updated the workflow to write `KUBECONFIG` to `$GITHUB_ENV`.
- The GitHub Actions example waited for a non-documented `complete` condition on `ChaosEngine`. Replaced it with polling for the `ChaosResult` and checking `.status.experimentStatus.verdict`.

## Review Notes
The direct ChaosEngine examples are still a lower-level workflow than the current ChaosCenter-first Litmus user experience, but the CRD names, environment variable names, and command patterns are valid for the documented Litmus custom resources and current Kubernetes chaos chart templates.
