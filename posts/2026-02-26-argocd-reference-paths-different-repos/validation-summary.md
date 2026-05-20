# Validation Summary: How to Reference Specific Paths from Different Repos in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source applications
- Kubernetes manifests and CRDs
- Helm
- Kustomize
- Jsonnet
- Git
- Argo CD CLI

## Sources Consulted
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Directory applications: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Tool Detection: https://argo-cd.readthedocs.io/en/latest/user-guide/tool_detection/
- Argo CD Jsonnet: https://argo-cd.readthedocs.io/en/latest/user-guide/jsonnet/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/

## Issues Found
- The post stated that Argo CD clones the same repository once and has no performance penalty when the same repo appears multiple times in `sources`. Official multi-source documentation says Argo CD generates manifests for each source separately and combines the results, and warns against overusing multiple sources. I changed this to a narrower statement that repeated entries should stay focused on related components.
- The post described Jsonnet as a separate auto-detected source type and included `*.jsonnet` in the tool detection checklist. Current Argo CD tool detection documentation lists Helm and Kustomize markers, with other sources treated as directory applications; the Jsonnet documentation says matching `*.jsonnet` files in a directory app are evaluated. I updated the source-type section and debugging checklist accordingly, and added the supported Kustomize marker filenames.

## Review Notes
The examples are intentionally illustrative and use placeholder repositories. The post would benefit in the future from a brief note that Argo CD documentation warns against using multi-source Applications as a generic grouping mechanism for many unrelated applications, but the existing examples are technically valid as related deployment layers.
