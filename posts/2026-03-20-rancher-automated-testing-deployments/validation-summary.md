# Validation Summary: How to Set Up Automated Testing for Rancher Deployments - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Fleet
- Kubernetes
- Helm
- Kind
- GitHub Actions
- Bash
- Python
- cert-manager
- local-path-provisioner

## Sources Consulted
- Helm chart tests: https://helm.sh/docs/v3/topics/chart_tests/
- `kubectl wait`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl create service clusterip`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_service_clusterip/
- `kubectl rollout status`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes service debugging task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- cert-manager installation docs: https://cert-manager.io/docs/installation/ and https://cert-manager.io/docs/installation/kubectl/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- `helm/kind-action` repository and current release metadata: https://github.com/helm/kind-action
- Rancher local-path-provisioner installation docs: https://github.com/rancher/local-path-provisioner
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet rollout strategy docs: https://fleet.rancher.io/0.14/rollout
- Fleet status and readiness references: https://fleet.rancher.io/reference/ref-status-fields and https://fleet.rancher.io/reference/ref-crds

## Issues Found
- The node smoke test could pass even when some nodes were `NotReady`, because it only grepped for any `Ready` output. I replaced it with `kubectl wait --for=condition=Ready nodes --all --timeout=120s`, which matches Kubernetes' documented readiness semantics.
- The DNS smoke test requested a TTY with `-t`, which is brittle in CI, and did not explicitly override the container command. I changed it to a non-TTY `kubectl run ... --rm -i --command -- nslookup kubernetes.default` form that aligns with documented `kubectl run` behavior.
- The pod and PVC smoke tests used fixed `sleep` delays and phase greps. I replaced them with `kubectl wait` checks so the examples reflect the documented and reliable readiness/wait flow.
- The fifth smoke test was labeled as a load balancer test, but the command actually creates a `ClusterIP` Service. I corrected the label to match the command.
- The workflow pinned outdated dependency examples: `helm/kind-action@v1.8.0` and `cert-manager` `v1.13.0`. I updated them to current documented versions as of April 24, 2026: `helm/kind-action@v1.14.0` and `cert-manager` `v1.20.2`.
- The cert-manager readiness check only waited on pods labeled `app=cert-manager`, which does not cover the full cert-manager installation. I changed it to wait for all cert-manager deployments to become `Available`.
- The local-path provisioner example used the moving `master` manifest URL and a misleading comment about Longhorn. I switched it to Rancher's documented stable install manifest (`v0.0.35`) and corrected the comment.
- The Python post-deploy validation example reapplied a fixed-name Job without deleting any existing Job first, which would fail on repeat runs because Jobs are not reusable that way. I added a delete step with `--ignore-not-found` before reapplying the Job.
- The Fleet example used `targets:` to model staged canary rollout behavior. Current Fleet docs describe staged rollouts through `rolloutStrategy.partitions`, so I rewrote the snippet accordingly and adjusted the conclusion to describe readiness-gated rollout behavior accurately.

## Review Notes
- The Helm test section is technically correct after verification: Helm chart tests still use the `helm.sh/hook: test` annotation and are executed with `helm test <release>`.
- The example images `busybox`, `nginx:latest`, and `registry.example.com/integration-tests:latest` are workable in principle, but they remain environment-specific and less reproducible than pinned digests or versioned tags.
- Versioned install snippets in this post will need periodic revalidation because `cert-manager`, `helm/kind-action`, and Fleet documentation evolve over time.
