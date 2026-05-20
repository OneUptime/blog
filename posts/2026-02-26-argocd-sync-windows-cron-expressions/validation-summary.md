# Validation Summary: How to Schedule Sync Windows with Cron Expressions in ArgoCD

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Argo CD sync windows
- Argo CD AppProject configuration
- Cron expressions
- Kubernetes kubectl
- Argo CD CLI
- Python croniter
- IANA time zones

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/project-specification/
- Argo CD `SyncWindow` source definition and validation logic: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- robfig/cron v3 package documentation: https://pkg.go.dev/github.com/robfig/cron/v3
- robfig/cron v3 schedule matching implementation: https://github.com/robfig/cron/blob/master/spec.go

## Issues Found
- The monthly example implied that `0 2 1-7 * 1` could approximate the first Monday of the month. Argo CD uses robfig/cron v3, whose standard cron semantics treat restricted day-of-month and day-of-week fields as an OR when neither field is a wildcard, so that expression would match days 1-7 and every Monday. Removed the incorrect schedule and replaced it with guidance that exact first-Monday behavior needs external scheduling or config changes.
- The quarterly example said it represented quarter-end dates but used `0 22 28 3,6,9,12 *`, which runs on the 28th of each quarter-ending month, not on Mar 31, Jun 30, Sep 30, and Dec 31. Updated the comments to describe it as a near-quarter-end approximation.

## Review Notes
- The remaining sync window fields (`kind`, `schedule`, `duration`, `applications`, `manualSync`, and `timeZone`) match current Argo CD AppProject examples and source definitions.
- The `argocd proj windows list my-project`, `argocd app get my-app`, and `kubectl apply -f project.yaml` commands are plausible for the described validation workflow. The local `argocd` binary was not installed, so CLI syntax was checked against official command documentation.
- Argo CD uses a five-field cron parser for sync windows. The parser supports names for month/day-of-week and the standard `*`, `/`, `,`, `-`, and `?` cron field forms documented by robfig/cron.
