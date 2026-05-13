# Validation Summary: How to Handle VPA Conflicts with Flux Managed Resource Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Vertical Pod Autoscaler
- Flux CD Kustomization and HelmRelease
- Kubernetes Deployments and Pods
- kubectl JSONPath output
- GitHub Actions
- Prometheus and kube-state-metrics alerts

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference for drift detection ignore rules: https://fluxcd.io/flux/components/helm/api/v2/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- Prometheus vector matching/operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics

## Issues Found
- The introduction incorrectly said Flux reconciles VPA-modified runtime resources back to Git-declared values. VPA applies recommendations to Pods through admission and update behavior; it does not rewrite the Deployment template, and Flux does not normally patch VPA-mutated Pods back to Git values. Updated the wording to explain the real interaction.
- The diagnostic command treated Deployment template resources as proof that VPA recommendations were ignored. Added a live Pod resource check and clarified that Deployment template values are Git-declared values, not necessarily effective Pod values.
- The Initial mode explanation said Flux creates Pods. Flux applies the Deployment; the Deployment controller creates Pods. Updated the wording accordingly.
- The VPA examples discussed request management but omitted `controlledValues: RequestsOnly`, while the VPA default may control both requests and limits. Added `controlledValues: RequestsOnly` to the VPA resource policies.
- The Flux server-side apply section implied per-field exclusions for Kustomization-managed resources. Flux Kustomization supports resource-level apply policies, not JSON-path field exclusions. Rewrote the section to describe this limit and distinguish HelmRelease drift detection ignore rules.
- The best-practices section treated VPA `Auto` as a normal mode. Current VPA documentation marks `Auto` as deprecated and recommends explicit modes. Updated the guidance to prefer `Recreate` or `InPlaceOrRecreate` when automatic updates beyond Pod creation are needed.
- The Prometheus alert used a binary `and` without explicit vector matching. Because the terminated-reason metric includes the `reason` label, this can fail to match the restart metric. Added `and on (namespace, pod, container)`.

## Review Notes
The GitHub Actions example is intentionally generic and still assumes the runner has cluster credentials and required tools (`kubectl`, `jq`, and `yq`) available. A production workflow should add provider-specific authentication and tool installation steps.
