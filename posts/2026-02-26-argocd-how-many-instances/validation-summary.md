# Validation Summary: How Many ArgoCD Instances Should I Run?

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD Application and AppProject CRDs
- Argo CD Helm chart
- Redis HA for Argo CD

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD FAQ on repository polling and reconciliation intervals: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD Application Controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD Declarative Setup documentation for Application and AppProject specs: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Helm chart documentation: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- DandyDeveloper redis-ha Helm chart values: https://github.com/DandyDeveloper/charts/blob/master/charts/redis-ha/values.yaml

## Issues Found
- The controller sharding section said each controller replica handles a subset of Applications. Argo CD documentation describes controller sharding as distributing managed clusters across controller replicas. Updated the text to say "managed clusters."
- The sample Argo CD Application in the hub-and-spoke section omitted `spec.project`. Official examples include `project: default`, so the snippet was updated to include it.
- The Application Controller Processing Budget example used environment variables for status and operation processors. Official documentation exposes these as `--status-processors` and `--operation-processors` flags, so the Helm values snippet now uses `controller.extraArgs`.
- The decision framework implied Application count should lead directly to controller sharding. Since sharding is cluster-oriented, this was changed to recommend tuning controller processors and repo servers first, then considering multiple instances if needed.

## Review Notes
The numeric scale thresholds in the post are presented as practical guidelines rather than vendor-published hard limits. They remain acceptable as experience-based guidance, but future revisions should consider adding Argo CD metrics-based sizing advice for more precise capacity planning.
