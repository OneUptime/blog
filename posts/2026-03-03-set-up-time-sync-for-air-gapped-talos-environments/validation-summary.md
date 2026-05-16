# Validation Summary: How to Set Up Time Sync for Air-Gapped Talos Environments

## Status
validated

## Post Type
Tutorial / infrastructure configuration guide

## Technologies Covered
- Talos Linux
- Talos machine configuration documents
- talosctl
- chrony / chronyd
- gpsd
- NTP / SNTP
- GPS and PPS time references
- PTP hardware clocks and RTC reference clocks
- Air-gapped Kubernetes infrastructure

## Sources Consulted
- Talos Linux v1.13 Time Synchronization documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/time-sync
- Talos Linux v1.13 TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/timesyncconfig
- Talos Linux v1.13 ResolverConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/resolverconfig
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux configuration patching documentation: https://www.talos.dev/v1.11/talos-guides/configuration/patching/
- chrony 4.7 chrony.conf documentation: https://chrony-project.org/doc/4.7/chrony.conf.html
- GPSD Time Service HOWTO: https://gpsd.gitlab.io/gpsd/gpsd-time-service-howto.html

## Issues Found
- The Talos examples used the older `machine.time` configuration shape. Current Talos documentation uses the `TimeSyncConfig` document for NTP/PTP time synchronization. Updated all Talos NTP snippets to `apiVersion: v1alpha1`, `kind: TimeSyncConfig`, and `ntp.servers`.
- The live Talos patch examples used JSON patches against `/machine/time`. Updated them to patch the `TimeSyncConfig` document with `talosctl patch machineconfig --patch`, matching Talos multi-document configuration patching.
- The combined Talos time/DNS example placed DNS nameservers under `machine.network.nameservers`, which is not the current documented resolver configuration. Updated it to use a separate `ResolverConfig` document with `nameservers[].address`.
- The chrony RTC reference-clock example omitted the required RTC device parameter. Updated it to the documented `refclock RTC /dev/rtc0:utc ...` form and made it an alternative to the PHC reference, so the example does not configure two local reference clocks at once.
- The OCXO/rubidium reference-clock example described an unsynchronized stable local standard but did not mark the reference clock with chrony's `local` refclock option. Added `local` to the PHC example per chrony documentation for unsynchronized stable clocks.
- The leap-second section instructed users to download `leap-seconds.list` but configured `leapsectz right/UTC`, which uses the system timezone database instead of the downloaded file. Updated the directive to `leapseclist /etc/chrony/leap-seconds.list`.

## Review Notes
- The chrony GPS/gpsd SHM examples are syntactically valid and align with gpsd's documented SHM integration. The exact GPS/PPS offsets and precision values still need calibration for real hardware.
- The UDP `nc -zvu` monitoring check is implementation-dependent across netcat variants, but it is acceptable as a lightweight reachability example rather than a definitive NTP health check.
