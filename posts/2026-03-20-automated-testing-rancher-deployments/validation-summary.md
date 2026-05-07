# Validation Summary: How to Set Up Automated Testing for Rancher Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- GitHub Actions
- LitmusChaos
- Bash

## Sources Consulted
- Helm Chart Tests: https://helm.sh/docs/topics/chart_tests/
- Helm Chart Hooks: https://helm.sh/docs/topics/charts_hooks/
- `helm test` command reference: https://helm.sh/docs/helm/helm_test/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Litmus pod-delete experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- Litmus ChaosEngine state docs: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-engine/engine-state/

## Issues Found
- The introduction and Helm test section described Helm tests as validating the chart itself. I updated the wording to reflect Helm's documented behavior: `helm test` validates the deployed release in-cluster.
- The Helm test example suggested `kubectl logs myapp-test` even though the manifest deletes successful test hooks with `hook-succeeded`. I replaced that with `helm test ... --logs`, which Helm documents as emitting test pod logs before cleanup.
- The smoke-test hook comment said `CronJob`, but the manifest is a `Job`. I corrected the comment.
- The smoke-test hook hard-coded `metadata.namespace: production`, which would run the hook job in the wrong namespace during staging installs. I changed it to `{{ .Release.Namespace }}` so the hook follows the release namespace.
- The GitHub Actions integration-test step used `kubectl run --wait`, which does not gate on the test container exiting successfully. I changed it to `kubectl run --attach --rm --restart=Never` so the workflow blocks on the test process exit code.
- The Litmus example used `litmus-admin`, which Litmus documents as a ChaosCenter/agent-provided RBAC path rather than the generic experiment service account. I switched the example to `pod-delete-sa`, matching the documented `pod-delete` experiment pattern.
- The post-deployment validation script could mis-handle deployments with zero ready replicas and used `kubectl top pods`, while the documented command is `kubectl top pod`. I added a default for empty `readyReplicas`, corrected the subcommand, and renamed the CPU section so it accurately reports usage instead of claiming a bounds check it did not perform.
- The validation script did not stop on failed `kubectl` commands. I added `set -e` so command failures do not fall through to a false `Validation PASSED` message.

## Review Notes
- `kubectl top` requires Metrics Server to be installed and working in the cluster.
- Helm's current chart test documentation presents tests as Jobs, but Helm hook behavior still supports Pod-based test hooks; the existing Pod example remains workable.
- The Litmus example assumes the corresponding service account and RBAC are created in the target namespace before the ChaosEngine is applied.
