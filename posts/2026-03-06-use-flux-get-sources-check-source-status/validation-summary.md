# Validation Summary: How to Use flux get sources to Check Source Status

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- GitRepository, HelmRepository, HelmChart, OCIRepository, Bucket, and ExternalArtifact sources
- kubectl
- jq
- Bash scripting

## Sources Consulted
- Flux CLI docs: `flux get sources` - https://fluxcd.io/flux/cmd/flux_get_sources/
- Flux CLI docs: `flux get sources all` - https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI docs: `flux get sources git` - https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI docs: `flux reconcile source git` - https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux Source Controller docs: GitRepository - https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source Controller docs: HelmRepository - https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source Controller docs: HelmChart - https://fluxcd.io/flux/components/source/helmcharts/
- Flux Source Controller docs: OCIRepository - https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source Controller docs: Bucket - https://fluxcd.io/flux/components/source/buckets/
- Local Flux CLI help output from Flux v2.8.7 downloaded from the official fluxcd/flux2 GitHub release.

## Issues Found
- The post used unsupported `flux get sources ... -o yaml` and `flux get sources ... -o json` examples. Current Flux `get sources` commands do not expose an `-o/--output` flag, so those examples were changed to `kubectl get ... -o yaml/json` where structured output is needed.
- The Git reconciliation example used `flux reconcile source git ... --revision main`, but current `flux reconcile source git` does not support a `--revision` flag. The example was changed to a supported reconcile command.
- The artifact inspection command piped `kubectl -o jsonpath='{.status.artifact}'` into `jq`, but that jsonpath expression does not emit a JSON object. It was changed to `kubectl get ... -o json | jq '.status.artifact'`.
- The health check script counted every occurrence of `False`, which would count healthy rows where `SUSPENDED` is `False` as failures. It now uses Flux's `--status-selector ready=false` flag and counts returned rows.
- The post implied every downstream reconciliation stops whenever a source is unhealthy. This was narrowed to downstream resources that depend on the source's latest artifact.
- The command family now includes `flux get sources external`; the health script and quick reference were updated to include ExternalArtifact sources.

## Review Notes
The `flux get sources all` command is documented by Flux as preview and under development, so future Flux releases may change its behavior. The post is otherwise accurate for the current Flux CLI documentation and Flux v2.8.7 help output reviewed on 2026-05-14.
