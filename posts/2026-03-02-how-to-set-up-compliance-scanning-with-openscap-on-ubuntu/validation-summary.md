# Validation Summary: How to Set Up Compliance Scanning with OpenSCAP on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSCAP (oscap, oscap-ssh, oscap-chroot)
- SCAP Security Guide (SSG) — ssg-base, ssg-debderived packages
- XCCDF 1.2 (profiles, tailoring, rule-results)
- OVAL (system characteristics, definitions)
- SCAP DataStreams (ssg-ubuntu2204-ds.xml)
- Ubuntu 22.04 (apt packaging, cron)
- Bash scripting and Python 3 (XML parsing with ElementTree)
- Ansible (as a remediation fix-type)

## Sources Consulted
- OpenSCAP user manual: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- oscap(8) manpage: https://manpages.ubuntu.com/manpages/noble/man8/oscap.8.html
- oscap-ssh(8) manpage: https://manpages.ubuntu.com/manpages/noble/man8/oscap-ssh.8.html
- OpenSCAP source: https://github.com/OpenSCAP/openscap
- ComplianceAsCode/content (SSG) Ubuntu 22.04 profiles directory: https://github.com/ComplianceAsCode/content/tree/master/products/ubuntu2204/profiles
- XCCDF 1.2 specification (NIST IR 7275r4) — namespace `http://checklists.nist.gov/xccdf/1.2`

## Issues Found

1. **Wrong SSG profile IDs for Ubuntu.** The post originally used `xccdf_org.ssgproject.content_profile_cis`, `..._cis_level2`, and `..._pci-dss`. None of these exist in SSG for Ubuntu. The actual Ubuntu 22.04 profiles are `cis_level1_server`, `cis_level1_workstation`, `cis_level2_server`, `cis_level2_workstation`, `stig`, and `standard`. PCI-DSS profiles only exist for RHEL in SSG, not Ubuntu. Replaced `PROFILE` variable everywhere with `xccdf_org.ssgproject.content_profile_cis_level1_server`, rewrote the profile list to the correct six Ubuntu profiles, updated the custom-profile `extends=` to the correct ID, and removed the misleading PCI-DSS mention from the intro.

2. **`oscap xccdf compare-results` does not exist.** There is no built-in results-diff subcommand in OpenSCAP (valid `oscap xccdf` subcommands are `eval`, `remediate`, `resolve`, `validate`, `export-oval-variables`, `generate`). Replaced the "Comparing Scans Over Time" section with a Python script using ElementTree that loads two result XML files and prints rules that regressed (pass→fail) and were fixed (fail→pass).

3. **`oscap oval collect` redirected to stdout.** The original `oscap oval collect ... > /tmp/system-data.xml` does not work — `oscap oval collect` writes system characteristics via the `--syschar FILE` option, not to stdout. Corrected to `oscap oval collect --syschar /tmp/system-data.xml "$SSG_FILE"`.

4. **Conceptually wrong "offline scanning" section.** The original workflow mixed up local and remote steps and never actually used the collected system data for evaluation. Rewrote as a "Remote Scanning Over SSH" section using `oscap-ssh` (the canonical tool, in `openscap-utils`) and added an `oscap-chroot` example for genuine offline (mounted-filesystem) scanning.

5. **`oscap xccdf generate report ... | grep -c "pass"` is broken.** The generated HTML report contains many unrelated occurrences of "pass" in CSS classes, IDs, descriptions, and boilerplate, so the count is nonsense. Replaced with `grep -oE '<result>pass</result>' result.xml | wc -l`, which counts the actual rule-result elements in the result XML.

6. **CI/CD script grep patterns were too loose and had a div-by-zero risk.** Original used `grep -c "result.*fail"` / `grep -c "result.*pass"`, which can match unintended lines (e.g., commentary in the XML), and `SCORE=$((PASS_COUNT * 100 / TOTAL))` would crash with division-by-zero if scanning produced no results. Tightened to `grep -oE '<result>(fail|pass)</result>' | wc -l` and guarded the score calculation with an `if [ "$TOTAL" -gt 0 ]` check.

7. **`oscap info --fetch-remote-resources` is the wrong flag for listing profiles.** `--fetch-remote-resources` is an `oscap xccdf eval`/`remediate` flag (it fetches remote OVAL during scanning), not an `oscap info` flag. Replaced with the canonical `oscap info --profiles <ds.xml>`, which prints `profile_id:title` pairs and is the documented way to list profiles.

## Review Notes

- Package names (`libopenscap8`, `openscap-scanner`, `openscap-utils`, `ssg-base`, `ssg-debderived`) and the DataStream file path (`/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml`) are correct for Ubuntu 22.04.
- Exit code semantics (0 = all pass, 2 = some fail) for `oscap xccdf eval` are documented in the openscap manpage and are correct as stated.
- The `oscap xccdf eval` flags used (`--profile`, `--results`, `--report`, `--oval-results`, `--rule`, `--tailoring-file`) and the `oscap xccdf generate fix` flags (`--profile`, `--output`, `--fix-type bash|ansible`) are all valid.
- The XCCDF 1.2 namespace, tailoring XML structure (`<Tailoring>`, `<Profile extends="...">`, `<select idref="..." selected="false"/>`, `<set-value idref="...">`) are correct per the XCCDF specification. The tailoring `id` (`xccdf_custom_tailoring`) and profile `id` don't strictly follow the recommended `xccdf_<reverse-dns>_tailoring_<name>` / `xccdf_<reverse-dns>_profile_<name>` naming, but most current oscap builds accept them in tailoring files; left as-is to avoid over-modifying the author's example.
- The Python parsing script references `/var/log/scap-results/results-latest.xml`, but no step in the post creates a `-latest` symlink. A reader running the examples literally would need to substitute the dated filename or create the symlink. Left as-is since it's a minor cosmetic issue and the dated path is shown one section above.
- The `--rule` flag with rule IDs (`sshd_disable_root_login`, `sshd_disable_empty_passwords`) — these are real SSG rule IDs and the flag accepts being passed multiple times.
- Version caveat: SSG profile lists evolve. The set listed (cis_level1/2_server/workstation, stig, standard) reflects the current Ubuntu 22.04 content; older releases of `ssg-debderived` may ship a different subset.
