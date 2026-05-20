# Validation Summary: How to Deploy Jsonnet Applications with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Jsonnet
- Kubernetes manifests
- GitOps
- Helm
- Kustomize

## Sources Consulted
- Argo CD Jsonnet documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Directory documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/directory/
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/tool_detection/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Helm 3 FAQ / changes since Helm 2: https://v3.helm.sh/docs/faq/changes_since_helm2/

## Issues Found
- The post compared Jsonnet with Helm by saying Helm requires Tiller. Helm 3 removed Tiller, so this was outdated. Changed the comparison to focus on chart repositories and Helm release state.
- The post said every Jsonnet file evaluates to JSON or YAML. Jsonnet evaluates to JSON data; Argo CD can parse that generated data into Kubernetes manifests. Updated the wording.
- The post implied the repo server applies resources to the cluster. The repo server generates manifests; Argo CD applies them during sync. Updated the wording.
- The post described Jsonnet as an Argo CD source type and claimed Argo CD looks for `main.jsonnet` by default. Official Argo CD documentation says Jsonnet is handled in directory applications and any file matching `*.jsonnet` is evaluated. Updated the explanation and summary.
- The "custom entry point" YAML snippet did not actually specify an entry point. Argo CD does not expose a `main.jsonnet` entry-point field in `directory.jsonnet`. Replaced it with a correct `directory.include` example for rendering a specific Jsonnet file.
- The post said Argo CD looks for `.jsonnet`, `.libsonnet`, or `.json` as Jsonnet inputs. Official docs specify `*.jsonnet` files are treated as Jsonnet; `.libsonnet` files are libraries to import. Updated the note.
- The hidden-field gotcha said fields start with `::`. Jsonnet hidden fields are declared with `::` after the field name. Updated the wording.

## Review Notes
The Argo CD CLI was not installed locally in the review environment, so CLI flags were checked against the official command reference. The `jsonnet` binary was also not installed locally, so Jsonnet syntax was reviewed against the language syntax and Argo CD examples rather than executed locally.
