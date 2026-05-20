# Validation Summary: How to Limit ApplicationSet Generated Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet controller
- Kubernetes
- kubectl
- jq
- Prometheus metrics

## Sources Consulted
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet post selector documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Post-Selector/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD Cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Matrix generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet resource modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD ApplicationSet controller source: https://github.com/argoproj/argo-cd/blob/master/applicationset/controllers/applicationset_controller.go
- Referenced OneUptime blog URL: https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-debug-generation/view

## Issues Found
- The post claimed Argo CD has a global `applicationsetcontroller.policy` `maxApplications` setting. Official ApplicationSet policy documentation only supports resource modification policies such as `sync`, `create-only`, `create-update`, and `create-delete`; there is no documented `maxApplications` setting. Replaced this with a supported dry-run preview command that counts `.status.resources`.
- The post selector example placed `selector` under the Git generator configuration and used a directory generator while claiming `config.json` fields would be used for filtering. Official docs define post selectors as a sibling of the generator, and Git directory generators do not parse metadata files. Changed the example to use the Git file generator with `services/*/config.json` and moved `selector` to the correct level.
- The matrix generator example placed the post selector under `matrix`. Official post selector documentation applies `selector` at the generator entry level. Moved the selector to be a sibling of `matrix`.
- The application count command used `app.kubernetes.io/managed-by=applicationset-controller`, which is not a guaranteed label on generated Applications. Replaced it with a `jq` filter that counts Applications with an `ApplicationSet` owner reference, matching how the controller tracks generated Applications.
- The per-ApplicationSet count command used `.status.resources | length`, which can undercount if the status resources list is truncated. Updated it to prefer `.status.resourcesCount` and fall back to the resources list length for older installations.

## Review Notes
The remaining examples use the older non-Go-template `{{path}}` style. This is still consistent with older ApplicationSet examples, but newer Argo CD documentation commonly shows `goTemplate: true` with dot-prefixed variables such as `{{.path.path}}`.
