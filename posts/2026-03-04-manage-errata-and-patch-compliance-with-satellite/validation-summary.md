# Validation Summary: How to Manage Errata and Patch Compliance with Satellite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Satellite
- Hammer CLI
- Satellite errata management
- Satellite Remote Execution
- Content views and errata filters

## Sources Consulted
- Red Hat Satellite 6.19 Managing Content, "Managing errata": https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/managing_content/managing_errata_content-management
- Red Hat Satellite 6.19 Hammer reference, "erratum": https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/hammer_reference/hammer-erratum
- Red Hat Satellite 6.18 Hammer reference, "host": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-host
- Red Hat Satellite 6.18 Hammer reference, "job-invocation": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-job-invocation
- Red Hat Satellite 6.19 Hammer reference, "recurring-logic": https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/hammer_reference/hammer-recurring-logic
- Red Hat Satellite 6.18 Managing Content, "Creating a content view filter by using CLI": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/managing_content/managing_content_views_content-management

## Issues Found
- `hammer erratum list --errata-type security` is not a current documented option. Changed it to `--search "type = security"`, which matches the documented errata search field.
- `hammer host errata list --errata-type security` is not the documented host errata option. Changed it to `--type security`.
- `hammer host errata apply` is unsupported in current Satellite Hammer reference. Replaced install examples with `hammer job-invocation create --feature katello_errata_install`, as documented by Red Hat.
- The "apply all applicable security errata" example attempted to apply by errata type directly. Replaced it with a command that collects security errata IDs from `hammer host errata list` and passes those IDs to the Remote Execution feature.
- Remote Execution examples used the job template name directly. Changed those to the documented `--feature katello_errata_install` form.
- Compliance report examples used non-documented host list fields such as `Installable Errata (Security)`. Replaced them with documented host list fields: `Security` and `Bugfix`.
- `hammer recurring-logic create` is not a documented command. Recurrence is configured on `hammer job-invocation create` with `--cron-line`, so the scheduled examples were corrected.
- Scheduled errata installation used an unsupported `errata_type=security` input. Changed it to pass a specific erratum ID with `errata=RHSA-2026:0123`.
- The patch drift search used an undocumented `applicable_errata_security > 5` field. Changed it to the documented `errata_status = security_needed` search and the `Security` output field.
- The host info field casing was corrected from `Installed At` to the documented `Installed at`.

## Review Notes
Current Satellite versions prefer Remote Execution for errata installation. Older Satellite documentation includes `hammer host errata apply`, but the current Hammer reference marks it unsupported and directs users to `hammer job-invocation create --feature katello_errata_install`.
