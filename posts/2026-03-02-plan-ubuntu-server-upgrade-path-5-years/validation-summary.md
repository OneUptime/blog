# Validation Summary: How to Plan Your Ubuntu Server Upgrade Path for the Next 5 Years

## Status
validated

## Post Type
Strategic guide / planning tutorial

## Technologies Covered
- Ubuntu Server (20.04 Focal, 22.04 Jammy, 24.04 Noble, 26.04 Resolute)
- Ubuntu Pro / ESM (`pro` CLI, `pro security-status`)
- `lsb_release`, `do-release-upgrade`
- Ansible (fleet inventory)
- Python (3.10, 3.12)
- PostgreSQL (14, 16), MariaDB (10.6, 10.11)
- OpenSSL 3.x
- DKMS / custom kernel modules
- Packer, Vagrant (golden images)
- Kafka (`kafka-consumer-groups.sh`), RabbitMQ, Redis
- AWS ELBv2 (`aws elbv2` CLI)

## Sources Consulted
- Ubuntu release cycle: https://ubuntu.com/about/release-cycle
- Ubuntu 20.04 LTS end-of-standard-support announcement: https://ubuntu.com/blog/ubuntu-20-04-lts-end-of-life-standard-support-is-coming-to-an-end-heres-how-to-prepare
- Ubuntu version history (Wikipedia)
- Ubuntu for Developers — Python availability: https://documentation.ubuntu.com/ubuntu-for-developers/reference/availability/python/
- Ubuntu Server docs (PostgreSQL): https://ubuntu.com/server/docs/install-and-configure-postgresql/
- Launchpad `libssl-dev` (Jammy) and `openssl` (Noble) package pages
- Ubuntu 24.04 release notes: https://documentation.ubuntu.com/release-notes/24.04/
- Canonical announcement of Ubuntu 26.04 LTS "Resolute Raccoon": https://canonical.com/blog/canonical-releases-ubuntu-26-04-lts-resolute-raccoon
- Ubuntu Pro Client `pro status` documentation: https://documentation.ubuntu.com/pro-client/en/latest/explanations/status_columns/

## Issues Found
1. **`ubuntu-support-status` command (Step 1 audit script and Ansible example).** The `ubuntu-support-status` tool was deprecated/removed in favor of the Ubuntu Pro Client. Replaced both occurrences with `pro security-status`, which is the current equivalent on Ubuntu 22.04/24.04.
2. **Non-existent `libssl3-dev` package (Step 6 example).** The comment used `libssl-dev vs libssl3-dev` as an example of package-name changes, but `libssl3-dev` is not a real Ubuntu package — the OpenSSL development meta-package is always `libssl-dev`. Replaced with realistic examples (`libssl1.1 vs libssl3`, `python3.10 vs python3.12`).
3. **Ubuntu 26.04 codename listed as "TBD".** Canonical announced the codename "Resolute Raccoon" in October 2025, ahead of the April 2026 release. Updated the table entry from "TBD" to "Resolute".

## Review Notes
- The release dates and EOL dates in the LTS table are correct. Standard support for 20.04 formally ended at the end of May 2025 (the table shows "April 2025" which is the standard month for LTS EOLs — close enough given Ubuntu's convention).
- The Python (3.10 → 3.12), PostgreSQL (14 → 16), and MariaDB (10.6 → 10.11) version claims for 22.04 → 24.04 are all accurate.
- The OpenSSL 3.x statement for 24.04 is correct. Worth noting (not changed) that 22.04 was actually the first Ubuntu LTS to ship OpenSSL 3.0, so users migrating from 22.04 to 24.04 won't see the OpenSSL 1.1 → 3.x break — that hit users on 20.04 → 22.04. The post's framing still works because the testing advice is generic.
- All other CLI commands (`lsb_release`, `pg_dump`, `dkms status`, `do-release-upgrade`, `aws elbv2 deregister/register-targets`, `kafka-consumer-groups.sh`, `packer build`, `vagrant box add`) are syntactically correct.
- The "Ubuntu Pro provides 10 years of total maintenance (5 standard + 5 ESM)" math underlying the ESM EOL column is correct. Canonical also offers an additional Legacy Support extension (taking total support to 12 years) on some releases, but the table sticks to the standard ESM window, which is fine.
