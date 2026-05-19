# Validation Summary: How to Scan for Vulnerabilities with OpenSCAP on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSCAP (`oscap` CLI)
- SCAP (Security Content Automation Protocol)
- SCAP Security Guide (SSG) — `ssg-base`, `ssg-debderived`
- XCCDF benchmarks and OVAL definitions
- Canonical's Ubuntu OVAL / USN data
- Ubuntu (primarily 22.04 Jammy)
- Bash scripting, cron

## Sources Consulted
- OpenSCAP project documentation (open-scap.org) for `oscap` subcommands and flags (`xccdf eval`, `oval eval`, `info`, `xccdf generate fix`)
- Ubuntu package archive — verified package names `libopenscap8`, `openscap-scanner`, `openscap-utils`, `ssg-base`, `ssg-debderived` via `apt-cache search` / `apt-cache show` on the local Ubuntu 24.04 system
- SCAP Security Guide project (github.com/ComplianceAsCode/content) for profile IDs (`xccdf_org.ssgproject.content_profile_cis_level1_server`, etc.) and rule IDs (`sshd_disable_root_login`, `grub2_audit_argument`)
- Canonical security metadata: `https://security-metadata.canonical.com/oval/` URL pattern for `com.ubuntu.<codename>.usn.oval.xml.bz2`
- NIST SCAP specification overview for the description of XCCDF/OVAL

## Issues Found
1. **Install command mixed package names from different Ubuntu releases.** The original `sudo apt install -y libopenscap8 openscap-scanner openscap-utils` would fail on either Ubuntu 22.04 or 24.04: on 22.04 the `oscap` binary ships inside `libopenscap8` and there is no separate `openscap-scanner` package; on 24.04 `libopenscap8` was renamed to `libopenscap25t64` and the scanner was split into `openscap-scanner`. Since the rest of the post uses `ssg-ubuntu2204-ds.xml`, I changed the install line to `sudo apt install -y libopenscap8 openscap-utils` and added a short comment noting that `openscap-scanner` is the equivalent package on Ubuntu 24.04+.

## Review Notes
- The OVAL download URL pattern `https://security-metadata.canonical.com/oval/com.ubuntu.<codename>.usn.oval.xml.bz2` is the current Canonical-published location; readers on releases newer than Jammy should substitute the appropriate codename (e.g., `noble`).
- The post hardcodes `ssg-ubuntu2204-ds.xml` in several examples. Readers on Ubuntu 20.04, 24.04, etc. need to substitute `ssg-ubuntu2004-ds.xml` or `ssg-ubuntu2404-ds.xml`. The post mentions this once but it's worth keeping in mind throughout.
- The `xccdf_org.ssgproject.content_profile_standard` profile is more typical of Fedora/RHEL SSG content; on Ubuntu datastreams readers may see `cis_level1_server`, `cis_level1_workstation`, `cis_level2_server`, `cis_level2_workstation` instead. The post lists `standard` as one example, which may not always be present — minor potential confusion but not strictly incorrect.
- The illustrative `Score: 42.00% (42.00 / 100.00)` snippet is a simplified version of the actual `oscap` summary output (real output has a `Score` block with system/score/maximum/percent columns). The simplification is fine for tutorial purposes.
- `oscap info --fetch-remote-resources` is accepted by recent oscap versions when the datastream references remote OVAL definitions; otherwise the flag is a no-op. Left as-is.
- `oscap xccdf generate fix --fix-type bash|ansible` is valid; newer oscap versions also accept `--template` with full URN identifiers, but `--fix-type` is documented and supported.
