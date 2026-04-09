# Validation Summary: How to Install Ceph on SUSE Linux Enterprise

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Ceph (distributed storage system)
- SUSE Linux Enterprise Server (SLES) 15 SP5+
- SUSE Enterprise Storage (SES) 7
- cephadm (Ceph deployment tool)
- firewalld
- AppArmor
- Podman (container runtime)
- Grafana (monitoring dashboards)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/cephadm/install/
- Ceph cephadm bootstrap reference: https://docs.ceph.com/en/latest/cephadm/bootstrap/
- Ceph Manager Dashboard module documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph download site structure: https://download.ceph.com/
- SUSE SUSEConnect documentation: https://documentation.suse.com/sles/15-SP5/
- AppArmor administration on SLES: https://documentation.suse.com/sles/15-SP5/html/SLES-all/part-apparmor.html
- firewalld service definitions for Ceph: https://docs.ceph.com/en/latest/start/os-recommendations/#firewall

## Issues Found

### 1. Incorrect cephadm download URL (Approach 2)
- **What was wrong:** The URL `https://download.ceph.com/rpm-squid/opensuse-leap-15.5/noarch/cephadm` used an openSUSE-specific path that is non-standard. The cephadm standalone script is a platform-agnostic Python tool and is distributed via the standard `el9/noarch` path on the Ceph download site.
- **What was changed:** Updated URL to `https://download.ceph.com/rpm-squid/el9/noarch/cephadm`.
- **Why:** The canonical cephadm download path uses the `el9` directory regardless of target distribution, since cephadm is a self-contained Python script.

### 2. Misleading firewall section title
- **What was wrong:** The section title referenced "SuSEfirewall2 / firewalld" but the post targets SLES 15 SP5+, which exclusively uses firewalld. SuSEfirewall2 was the firewall tool for SLES 11/12 and is not present on SLES 15.
- **What was changed:** Updated title from "Configure Firewall (SuSEfirewall2 / firewalld)" to "Configure Firewall (firewalld)".
- **Why:** Mentioning SuSEfirewall2 is misleading for the target audience of SLES 15 SP5+ users.

### 3. Incorrect AppArmor reload command
- **What was wrong:** The command `apparmor_parser -r /etc/apparmor.d/abstractions/ceph` attempted to reload an AppArmor abstractions file as if it were a standalone profile. Abstractions are included by profiles and cannot be parsed/reloaded directly with `apparmor_parser -r`.
- **What was changed:** Replaced `apparmor_parser -r /etc/apparmor.d/abstractions/ceph` with `systemctl reload apparmor` to properly reload all AppArmor profiles that include the modified abstraction.
- **Why:** `apparmor_parser -r` expects a profile file, not an abstractions file. Reloading the AppArmor service ensures all profiles pick up the updated abstraction.

### 4. Contradictory BlueStore/FileStore configuration
- **What was wrong:** The tuning section was labeled "Configure Ceph to use XFS for non-BlueStore setups (legacy)" but included `ceph config set osd bluestore_block_size 107374182400`, which is a BlueStore-only option. This contradicted the stated purpose and mixed two incompatible storage backends.
- **What was changed:** Removed the `bluestore_block_size` line and updated the description to "For legacy FileStore setups, configure the OSD journal size" to accurately describe the remaining `osd_journal_size` setting.
- **Why:** `bluestore_block_size` is exclusively a BlueStore configuration parameter and has no relevance to non-BlueStore/FileStore setups. Including it under a "non-BlueStore" heading is technically incorrect.

### 5. Wrong Ceph Manager module name for Grafana
- **What was wrong:** The command `ceph mgr module enable grafana` references a non-existent mgr module. There is no Ceph Manager module called "grafana".
- **What was changed:** Updated to `ceph mgr module enable dashboard`, which is the correct module that handles Grafana integration.
- **Why:** The Ceph Dashboard module (`dashboard`) is what provides Grafana integration via the `ceph dashboard set-grafana-api-url` command. The `grafana` module does not exist.

## Review Notes
- The SES 7 product identifier (`ses/7/x86_64`) was designed for SLES 15 SP2/SP3. SUSE has been transitioning away from standalone SES releases. Users on SLES 15 SP5+ should verify that the SES 7 module is still available for their service pack version, as SUSE may have changed the delivery model.
- The FileStore configuration in the tuning section is marked as legacy, which is appropriate since modern Ceph (Nautilus+) defaults to BlueStore. Consider whether this legacy section is still useful for the target audience.
- The `ceph-mon` firewalld service and port 7480 for RGW are correctly referenced.
- The cephadm bootstrap flags (`--mon-ip`, `--cluster-network`, `--allow-fqdn-hostname`) are all valid and current.
