# Validation Summary: Flux CD vs Jenkins X: Which GitOps Tool to Choose

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Jenkins X / JayeX
- GitOps
- Kubernetes
- Tekton Pipelines
- Lighthouse
- Helm and Helm Controller
- Kustomize and Kustomize Controller
- Flux Image Automation
- Vault and External Secrets
- Flagger

## Sources Consulted
- Flux components documentation: https://fluxcd.io/flux/components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux image automation documentation: https://fluxcd.io/flux/components/image/
- Flux CLI reference: https://fluxcd.io/flux/cmd/flux/
- Flux bootstrap GitHub reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Jenkins X / JayeX overview: https://jenkins-x.io/v3/about/overview/
- Jenkins X / JayeX "What is" documentation: https://jenkins-x.io/v3/about/what/
- Jenkins X / JayeX environment configuration: https://jenkins-x.io/v3/develop/environments/config/
- Jenkins X / JayeX promotion documentation: https://jenkins-x.io/v3/develop/environments/promotion/
- Jenkins X / JayeX preview command reference: https://jenkins-x.io/v3/develop/reference/jx/preview/create/
- Jenkins X / JayeX promote command reference: https://jenkins-x.io/v3/develop/reference/jx/promote/
- Jenkins X / JayeX Vault setup documentation: https://jenkins-x.io/v3/admin/setup/secrets/vault/
- Jenkins X / JayeX pipeline catalog documentation: https://jenkins-x.io/v3/develop/pipelines/catalog
- CD Foundation projects page: https://cd.foundation/projects/
- CD Foundation 2025 annual report: https://cd.foundation/annual-report-2025/
- Tekton PipelineRun documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton v1beta1 to v1 migration documentation: https://tekton.dev/docs/pipelines/migrating-v1beta1-to-v1/

## Issues Found
- The post described Jenkins X as "Sandbox (via CD Foundation, now archived)." Current CDF materials list the project as active and being renamed to JayeX. Updated the status and maintenance wording.
- The introduction and conclusion omitted the current Jenkins X to JayeX rename, which is important for documentation searches and long-term planning. Added concise notes without restructuring the post.
- The Jenkins X UI row referred to "jx-ui"; current docs describe a read-only in-cluster pipeline dashboard/pipelines visualizer. Updated the wording.
- The Jenkins X architecture snippet used a `vault.url` style configuration. Current Jenkins X/JayeX docs configure Vault with `secretStorage: vault`, commonly alongside `webhook: lighthouse` and `kaniko: true`. Updated the snippet.
- The Jenkins X pipeline example used deprecated Tekton `tekton.dev/v1beta1` and non-authoritative `taskRef` names. Updated it to `tekton.dev/v1` and the documented Jenkins X pipeline catalog `uses:` pattern.
- The Flux manual gate example set `suspend: false` while describing a suspended approval gate. Changed it to `suspend: true` and clarified that `flux resume kustomization apps` resumes it after review.
- The Jenkins X command used `jx get activities`; documentation and examples use `jx get activity`. Updated the command.
- The resource footprint table used overly precise RAM/CPU figures not supported by official docs. Reworded those entries to qualitative, technically accurate comparisons.

## Review Notes
The post is technically relevant and contains implementation-oriented YAML and CLI examples. Some Jenkins X/JayeX details remain inherently version- and installation-dependent because optional components vary by platform and installation choices.
