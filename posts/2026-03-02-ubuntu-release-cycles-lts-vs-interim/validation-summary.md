# Validation Summary: How to Understand Ubuntu Release Cycles: LTS vs Interim Releases

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Ubuntu Linux (release model, LTS vs interim)
- Ubuntu Pro / Expanded Security Maintenance (ESM)
- `do-release-upgrade` and `/etc/update-manager/release-upgrades`
- Hardware Enablement (HWE) kernel stacks
- Ubuntu Pro Client (`pro`) tooling
- `lsb_release`, `hwe-support-status`
- APT repository sourcing (codename usage)

## Sources Consulted
- Ubuntu release schedule and EOL data: https://ubuntu.com/about/release-cycle and https://endoflife.date/ubuntu
- Ubuntu 24.04 Noble Numbat release notes (kernel 6.8 GA): https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890
- 24.04 HWE kernel progression (6.11 from 24.04.2, 6.14 from 24.04.3): https://discourse.ubuntu.com/t/kernel-hwe-update-for-the-upcoming-noble-24-04-3-point-release/62259
- Ubuntu codenames (23.10 Mantic Minotaur, 24.10 Oracular Oriole, 25.04 Plucky Puffin): Canonical and OMG! Ubuntu announcements
- Ubuntu Pro Client documentation (`pro status`, `pro security-status`): https://documentation.ubuntu.com/pro-client/en/latest/explanations/status_columns/
- Deprecation of `ubuntu-support-status` since 20.04: https://github.com/canonical/ubuntu.com/issues/7663
- `ubuntu-advantage-tools` rename to `ubuntu-pro-client`: https://discourse.ubuntu.com/t/ubuntu-pro-client/31027

## Issues Found
- **"Checking EOL Dates" section used deprecated tooling.** The original block invoked `ubuntu-support-status` (removed since Ubuntu 20.04) and recommended installing `ubuntu-advantage-tools` (renamed to `ubuntu-pro-client` as part of the Ubuntu Pro rebrand). The inline comment "Or check via the internet" next to `hwe-support-status --verbose` was also wrong — that script reads local manifest data, it does not make network calls.

  Replaced the block with the current Pro Client commands (`pro security-status`, `pro status`), kept `hwe-support-status --verbose` with an accurate description of what it does, and updated the install line to `sudo apt install ubuntu-pro-client`.

## Review Notes
- Release dates, codenames, EOL timelines (5 years standard / 10 years with Ubuntu Pro ESM), and the 22.04 → April 2027 standard / April 2032 ESM math all check out.
- Kernel version examples (6.8 GA for Noble, 6.11 HWE from 24.10) are correct as of when 24.04.2 was the current point release. As of May 2026, the HWE stack from 24.04.3 has moved to 6.14, but the example values remain valid illustrations of the GA-vs-HWE distinction so no edit was required.
- The `Prompt=lts` / `Prompt=normal` settings in `/etc/update-manager/release-upgrades` are accurate, as is the note that LTS-to-LTS upgrades open with the `.1` point release (typically August).
- The claim that ESM extends coverage to Universe packages is accurate (ESM Apps covers Universe; ESM Infra covers Main/Restricted) — Ubuntu Pro bundles both.
- Codename for 25.10 (Questing Quokka) is not listed in the post, which is fine since the post only enumerates up to 25.04; no action taken.
