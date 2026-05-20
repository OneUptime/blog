# Validation Summary: How to Scale ArgoCD for 100 Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- ApplicationSet
- AppProject
- Prometheus ServiceMonitor
- Redis

## Sources Consulted
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD general ConfigMap reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD high availability and scaling guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Project documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/

## Issues Found
- `timeout.reconciliation` was shown in `argocd-cmd-params-cm`, but Argo CD documents it as an `argocd-cm` setting. I moved it to a separate `argocd-cm` snippet.
- The reconciliation interval was described as a fixed 180 second default. Current Argo CD documentation describes the default as 120 seconds plus up to 60 seconds of jitter, so I updated the snippet and text.
- The ApplicationSet example used fasttemplate syntax. Argo CD documentation says fasttemplate will be deprecated in favor of Go Template, so I updated the example to `goTemplate: true`, added `goTemplateOptions`, and changed path parameters to current Go template syntax.
- The monorepo section implied monorepos usually only become problematic near 500+ applications. Argo CD documentation notes monorepos with many applications can affect repo-server performance and cache behavior much earlier, so I softened the claim and mentioned manifest path annotations and concurrency-safe manifest generation.
- The sharding guidance tied controller sharding to a fixed 500+ application threshold. Argo CD documents sharding primarily for large multi-cluster or high controller resource-demand cases, so I corrected that wording.

## Review Notes
The resource sizes in the post are reasonable example starting points, but Argo CD does not provide a single official sizing table for exactly 100 applications. Operators should validate them with workload-specific metrics such as reconciliation duration, repo-server pending requests, memory usage, and OOM events.
