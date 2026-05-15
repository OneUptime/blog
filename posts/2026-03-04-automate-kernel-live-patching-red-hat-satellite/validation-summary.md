# Validation Summary: How to Automate Kernel Live Patching with Red Hat Satellite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Satellite 6.x
- Hammer CLI
- kpatch and kpatch-dnf
- Kernel live patching
- Ansible
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Applying patches with kernel live patching": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Satellite 6.18 Hammer reference, "job-invocation": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-job-invocation
- Red Hat Satellite 6.18 Hammer reference, "recurring-logic": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-recurring-logic
- Red Hat Satellite 6.18 Hammer reference, "content-view": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-content-view
- Red Hat Satellite 6.18 Hammer reference, "host errata list": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-host
- Red Hat Satellite managing hosts documentation, "Using Report Templates to Monitor Hosts": https://docs.redhat.com/en/documentation/red_hat_satellite/6.14/html/managing_hosts/using_report_templates_to_monitor_hosts_managing-hosts

## Issues Found
- The content view promotion command omitted the content view version. Added `--version 1`, matching Red Hat Satellite examples for `hammer content-view version promote`.
- The remote execution examples used `Run Command - Script Default`, but Red Hat Satellite documents the default command template as `Run Command - SSH Default`. Updated the job invocation examples.
- The Ansible role used `dnf update -y kpatch-patch-*`, which is not Red Hat's documented kpatch subscription/update flow. Replaced it with `dnf kpatch auto && dnf update -y "kpatch-patch"` so systems subscribe installed kernels to live patching and then update installed patch modules.
- The scheduled job example used `hammer recurring-logic create`, but the Hammer `recurring-logic` command does not provide a `create` subcommand. Replaced it with `hammer job-invocation create --cron-line`, which is the documented way to create recurring job invocations.
- The monitoring example searched hosts by an unsupported-looking installed package field. Replaced it with a remote execution command that checks installed `kpatch-patch` RPMs and runs `kpatch list`, consistent with Red Hat's note that `kpatch list` does not show empty live patch packages.
- The errata search used `packages ~ kpatch`; Satellite's errata search documentation uses `package` and `package_name` fields. Updated the search to `package_name ~ kpatch-patch`.
- The host errata example filtered with a generic search string. Updated it to use documented `hammer host errata list` options: `--type security` and `--include-applicable true`.
- The report example used the wrong built-in report template name and an unsupported `--output` option. Updated it to `Host - All Installed Packages` with `--path /tmp`.

## Review Notes
The post is technically valid after these corrections. In a future revision, the examples could mention that live patch availability depends on Red Hat's kernel live patch cadence and that not every kernel or CVE receives a live patch.
