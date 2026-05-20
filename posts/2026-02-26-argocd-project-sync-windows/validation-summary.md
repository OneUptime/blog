# Validation Summary: How to Configure Project Windows (Sync Windows per Project) in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD AppProjects
- Argo CD sync windows
- Argo CD CLI
- Kubernetes custom resources
- Cron scheduling
- Argo CD RBAC

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD `argocd proj windows add` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_proj_windows_add/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD AppProject `SyncWindow` source: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- robfig/cron parser source used by Argo CD: https://github.com/robfig/cron/blob/master/spec.go

## Issues Found
1. The `manualSync` field was described backwards. The post said `manualSync: true` blocks manual syncs, but official Argo CD documentation and CLI help describe it as allowing manual syncs for a sync window. I corrected the field table, examples, explanatory text, and troubleshooting note so `manualSync: true` allows manual syncs and `false` or omitted means manual syncs remain governed by the window.

2. The emergency override example used `argocd app sync --force` as if it bypassed sync windows. The official `argocd app sync` command reference defines `--force` as force apply, not a sync-window override. I replaced the example with `argocd proj windows enable-manual-sync` followed by a normal `argocd app sync`.

3. The RBAC example tied emergency sync-window bypass to the `override` action. Argo CD RBAC documentation defines `override` for arbitrary manifests or certain revision override behavior, not normal sync-window bypass. I changed the example to grant the `sync` action for the application.

4. Two comments overstated what the examples did: the `28-31` cron example was labeled as "last day of month", and the hotfix allow window was labeled as "always allow" even though deny windows take precedence. I updated both comments to match the actual schedules and precedence behavior.

5. The cron reference used `0 2 1-7 * 1` as "First Monday of each month." Argo CD uses robfig/cron; when both day-of-month and day-of-week are restricted, that parser follows cron-style OR behavior unless one field is a wildcard. I replaced the example with a simple first-day-of-month schedule.

## Review Notes
The rest of the AppProject `syncWindows` fields, cron-style schedules, selector fields, `timeZone`, `argocd proj windows list`, and deny-over-allow precedence matched the official Argo CD documentation. The local `argocd` CLI was not installed, so command verification was performed against official Argo CD command reference pages.
