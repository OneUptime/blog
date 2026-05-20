# Validation Summary: How to Debug Jsonnet Rendering Issues in ArgoCD

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Argo CD
- Jsonnet
- Kubernetes manifests
- GitOps workflows
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD `argocd-cmd-params-cm.yaml` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD ApplicationSourceJsonnet and JsonnetVar API types: https://pkg.go.dev/github.com/argoproj/argo-cd/pkg/apis/application/v1alpha1
- Jsonnet language reference: https://jsonnet.org/ref/language.html
- Jsonnet standard library reference: https://jsonnet.org/ref/stdlib.html
- Jsonnet specification: https://jsonnet.org/ref/spec.html
- Linked OneUptime external variables guide: https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-external-variables/view
- Linked OneUptime library paths guide: https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-library-paths/view

## Issues Found
- The type mismatch Jsonnet example assigned `replicas` directly, which would not itself trigger a Jsonnet type error. Changed it to use `replicas + 1` so passing `"3"` as a string accurately demonstrates a Jsonnet numeric type mismatch.
- The duplicate field example labeled the diagnostic as a runtime error. Jsonnet rejects duplicate fields during static checking, so the example was changed to `STATIC ERROR: duplicate field: name`.
- The slow rendering section recommended `reposerver.timeout.seconds`, which is not the current `argocd-cmd-params-cm` key for repo-server RPC timeouts. Changed it to `controller.repo.server.timeout.seconds` and noted `server.repo.server.timeout.seconds` for CLI/UI manifest request timeouts.

## Review Notes
The `directory.jsonnet.extVars`, `directory.jsonnet.tlas`, `directory.jsonnet.libs`, `code: true`, `argocd app manifests --source live`, and `argocd app get --hard-refresh` usage matched official documentation. The local workspace did not have the `argocd` or `jsonnet` binaries installed, so CLI syntax was verified against official command references rather than local `--help` output.
