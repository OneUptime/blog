# Validation Summary: How to List and Clean the DNF Cache on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- DNF cache cleanup commands
- DNF configuration files
- dnf-automatic
- cron.weekly

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF Command Reference, clean and makecache commands: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference, keepcache, cachedir, metadata_expire, and metadata_timer_sync options: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF download plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/download.html

## Issues Found
- The post said each enabled repository gets a cache subdirectory. DNF can also keep temporary repository data from disabled, removed, or previously used repositories, so this was changed to "each repository DNF has used."
- The `dnf makecache --timer` example said it forces a timer-based background cache refresh. Official DNF documentation describes it as a timer-friendly, resource-aware mode that may exit without refreshing if it is too soon after the last successful timer run. The comment and explanation were corrected.
- The metadata expiration snippet described `metadata_expire=48h` as a human-readable format. The official DNF reference documents `metadata_expire` as time in seconds, although distribution repo files may use suffixed values. The example was changed to a less misleading interval example.
- The automation section was titled "Using a Systemd Timer" but the example created a `/etc/cron.weekly/` script. The heading was changed to "Using cron.weekly."
- The offline package section used `dnf download` without noting that it is provided by `dnf-plugins-core`. A sentence was added to clarify the plugin requirement.
- The offline install command used `dnf localinstall`, which official DNF documentation lists as a deprecated alias for `dnf install`. It was changed to `dnf install /tmp/offline-rpms/*.rpm`.

## Review Notes
The core DNF cache cleaning commands (`dnf clean packages`, `metadata`, `dbcache`, `expire-cache`, and `all`), `dnf makecache`, `keepcache`, `cachedir`, `metadata_expire`, and the dnf-automatic timer references were otherwise consistent with official DNF and Red Hat documentation.
