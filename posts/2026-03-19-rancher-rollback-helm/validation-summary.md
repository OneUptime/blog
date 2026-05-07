# Validation Summary: How to Roll Back Helm Releases in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- `kubectl`
- Shell scripting

## Sources Consulted
- Rancher docs, Helm Charts and Apps: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/helm-charts-in-rancher
- Helm 3 command docs, `helm rollback`: https://helm.sh/docs/v3/helm/helm_rollback/
- Helm 3 command docs, `helm history`: https://helm.sh/docs/v3/helm/helm_history/
- Helm 3 command docs, `helm get values`: https://helm.sh/docs/v3/helm/helm_get_values/
- Helm 3 command docs, `helm upgrade`: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm best practices, Custom Resource Definitions: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Kubernetes docs, `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm source, rollback implementation (`pkg/action/rollback.go`): https://github.com/helm/helm/blob/v3.20.0/pkg/action/rollback.go
- Rancher dashboard source, installed app actions (`shell/models/catalog.cattle.io.app.js`): https://github.com/rancher/dashboard/blob/v2.13.0/shell/models/catalog.cattle.io.app.js
- `helm-diff` plugin repository: https://github.com/databus23/helm-diff

## Issues Found
- The introduction and Step 2 claimed Rancher itself provides a rollback action for Installed Apps. Current Rancher docs and dashboard source show Installed Apps are documented for inspection, upgrade, and uninstall, not a documented rollback action. I changed the post to use Rancher for locating and inspecting the release, and Helm CLI for the rollback itself.
- The "Understanding Helm Rollbacks" section said Helm re-renders chart templates during rollback. Helm's rollback implementation instead creates a new release revision from the stored chart, config, manifest, hooks, and related metadata from the target revision, then applies the stored manifest. I corrected that explanation.
- The `--force` and `--cleanup-on-fail` comments under `helm rollback` were imprecise. I updated them to match Helm's documented behavior.
- The verification step used `helm get values` as if it showed the full effective configuration. By default it only returns user-supplied values. I changed it to `helm get values --all` and clarified the comment.
- The resource quota troubleshooting command parsed `kubectl describe namespace` output with `grep`. I replaced it with `kubectl describe resourcequota -n default`, which is the direct Kubernetes resource to inspect.
- The hook failure section referred to `pre-install` and `post-install` hooks during rollback. Helm rollback runs `pre-rollback` and `post-rollback` hooks. I corrected the hook names.
- The health check automation example tried to `curl` a cluster-internal service DNS name directly from the shell running the script. That is not generally valid from an external CI runner. I updated the example to use `kubectl port-forward` and then curl `127.0.0.1`.
- The best-practices section treated `helm diff` as built-in. It is provided by the `helm-diff` plugin. I qualified that recommendation accordingly.

## Review Notes
- Rancher supports Helm 3 compatible charts. The post keeps `--atomic`, which is valid in Helm 3.x. Helm 4 deprecates `--atomic` in favor of `--rollback-on-failure`, so this is a version-specific caveat to keep in mind for future updates.
- Local `helm` and `kubectl` binaries were not available in this workspace, so command validation was done against official documentation and upstream source code rather than live CLI help output.
