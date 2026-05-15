# Validation Summary: How to Verify NTP Synchronization Using chronyc Commands on RHEL

## Status
validated

## Post Type
Technical guide / command reference

## Technologies Covered
- Red Hat Enterprise Linux 9
- chrony
- chronyd
- chronyc
- NTP
- Bash, grep, and awk

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Chapter 11. Configuring time synchronization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- chrony upstream chronyc(1) documentation: https://chrony-project.org/doc/4.4/chronyc.html

## Issues Found
- The `Leap status` description only mentioned normal status and upcoming leap seconds. Updated it to include the unsynchronized state, matching the `tracking` output semantics.
- The `chronyc sources` `S` column described `?` as simply unreachable. Updated it because chrony uses `?` for sources that are not selectable for multiple reasons, including unreachable sources, unsynchronized sources, or insufficient measurements.
- The `chronyc sources` `S` column omitted `~`, which chrony uses for sources with too much variability. Added it to the state list and the troubleshooting flow.
- The awk example labeled all `?` sources as `UNREACHABLE`. Updated the heading and output label to `NOT SELECTABLE` so the script matches chrony's documented meaning.

## Review Notes
The local review environment did not have `chronyc` or a `chronyc(1)` man page installed, so command verification was performed against upstream chrony documentation and Red Hat's RHEL 9 documentation. The remaining commands and examples are consistent with those references.
