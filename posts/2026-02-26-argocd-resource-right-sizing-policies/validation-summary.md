# Validation Summary: How to Implement Resource Right-Sizing Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD and ApplicationSet
- Kubernetes Deployments, CronJobs, resource requests, and resource limits
- Kubernetes Vertical Pod Autoscaler
- Kustomize overlays and inline patches
- OPA Gatekeeper ConstraintTemplates and Constraints
- Goldilocks by Fairwinds
- kubectl, argocd CLI, jq, Bash, and Python

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Fairwinds Goldilocks installation documentation: https://goldilocks.docs.fairwinds.com/installation/
- Fairwinds Goldilocks advanced usage documentation: https://goldilocks.docs.fairwinds.com/advanced/

## Issues Found
- The ApplicationSet example omitted `spec.template.spec.project`. Argo CD Application examples and ApplicationSet examples normally include the project field, so I added `project: default`.
- The CronJob used `python:3.11-slim` even though the script calls `kubectl` and is expected to create Git pull requests. I changed the example image to a custom pipeline image and noted that it must include Python, kubectl, git, and PR tooling.
- The Python subprocess calls did not check command failures before parsing JSON. I added `check=True` so failed `kubectl` calls raise an error instead of producing misleading parse failures.
- The Gatekeeper Rego policy treated all CPU quantities as millicores by trimming only the `m` suffix, which makes values like `"4"` compare incorrectly. I added helper functions that convert CPU quantities to millicores and memory quantities to MiB.
- The Gatekeeper constraint declared `maxCpuPerReplica` and `maxMemoryPerReplica` parameters but did not enforce them. I added violations that enforce those parameters against container requests.
- The `apps/v1` Deployment example omitted the required selector and matching pod template labels. I added `spec.selector.matchLabels` and `spec.template.metadata.labels`.

## Review Notes
- The snippets are still illustrative and assume supporting resources exist, including the VPA CRD/components, metrics source, Argo CD credentials, RBAC for the right-sizing service account, a `right-sizing-scripts` ConfigMap, and repository-specific PR automation.
- The Goldilocks chart version shown is pinned to `8.0.0`; this can be valid for reproducible examples, but future maintenance should periodically review the chart version and values against the current Fairwinds chart.
