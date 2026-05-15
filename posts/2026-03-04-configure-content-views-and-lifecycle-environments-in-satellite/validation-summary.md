# Validation Summary: How to Configure Content Views and Lifecycle Environments in Satellite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Satellite
- Hammer CLI
- RHEL content repositories
- Content Views
- Lifecycle Environments
- Content view filters and errata filters

## Sources Consulted
- Red Hat Satellite 6.18 Hammer reference: lifecycle-environment commands: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-lifecycle-environment
- Red Hat Satellite 6.18 Hammer reference: content-view commands: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-content-view
- Red Hat Satellite 6.18 Hammer reference: content-view filter commands: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-content-view-filter
- Red Hat Satellite 6.18 Managing content: creating content view filters by using CLI: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/managing_content/managing_content_views_content-management
- Red Hat Satellite 6.19 Managing errata: creating a content view filter for errata by using CLI: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/managing_content/managing_errata_content-management

## Issues Found
- The errata cutoff filter used an exclude filter with `--end-date "2026-03-01"` while describing a cutoff workflow. With an exclusion filter, `--end-date` matches errata up to the date and would exclude older errata. Changed the rule to use `--start-date "2026-03-01"` so the exclude filter removes errata on or after the cutoff, and added `--date-type updated` to make the date column explicit.

## Review Notes
The RHEL repository names in the examples are representative and can vary depending on enabled repository sets, release version, and Satellite content synchronization state. The Hammer options used in the post are current in the checked Satellite 6.18/6.19 documentation.
