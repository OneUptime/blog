# Validation Summary: How to Build ArgoCD Cluster Generator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet controller
- ApplicationSet Cluster, Matrix, Merge, Git, and List generators
- Kubernetes Secrets and label selectors
- Argo CD CLI
- Argo CD sync policies and sync options

## Sources Consulted
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Progressive-Syncs/
- Argo CD Merge Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Merge/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD declarative cluster setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD CLI `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD installation and CLI installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/ and https://argo-cd.readthedocs.io/en/stable/cli_installation/

## Issues Found
- The RollingSync example selected Applications by the `region` label, but the generated Applications did not define that label. RollingSync groups are selected from labels on generated Application resources, so I added `metadata.labels.region: '{{metadata.labels.region}}'` to the template.
- The Progressive Rollouts section omitted the current requirement that progressive syncs are experimental and must be explicitly enabled on the ApplicationSet controller. I added a short note before the RollingSync example.

## Review Notes
- The post uses the default ApplicationSet template syntax (`{{name}}`, `{{server}}`, and related parameters). Current Argo CD documentation commonly shows Go templates with `goTemplate: true`, but the default syntax remains represented in the ApplicationSet specification.
- The local cluster examples assume the default local cluster identity (`in-cluster`). Environments that have renamed or explicitly registered the local cluster may need to adjust selectors.
