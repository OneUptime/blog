# Validation Summary: How to Implement SCAP Security Guide on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenSCAP scanner (`oscap`)
- SCAP Security Guide (SSG) content (ComplianceAsCode project)
- XCCDF, OVAL, CPE, CVE SCAP standards
- Ubuntu (22.04 / 24.04) APT package management
- CIS Benchmarks and DISA STIG profiles
- Ansible (for remediation playbooks)
- Cron scheduling

## Sources Consulted
- Ubuntu package archive: https://packages.ubuntu.com/ (verified availability of `openscap-scanner`, `openscap-utils`, `libopenscap8`, `libopenscap25t64`, `ssg-base`, `ssg-debderived`, and absence of `ssg-ubuntu`)
- Ubuntu noble file listing for `ssg-debderived` confirming presence of `ssg-ubuntu2204-ds.xml`
- Debian package tracker for `scap-security-guide`: https://tracker.debian.org/pkg/scap-security-guide
- ComplianceAsCode/content GitHub releases: https://github.com/ComplianceAsCode/content/releases
- OpenSCAP `oscap` man page (maint-1.3 branch) for exit code semantics
- OpenSCAP User Manual: https://www.open-scap.org/

## Issues Found

1. **Non-existent package `ssg-ubuntu` in install command.** The post instructed users to `apt-get install -y ssg-ubuntu ssg-base ssg-debderived`, but `ssg-ubuntu` does not exist in any Ubuntu repository (verified via packages.ubuntu.com). The SCAP Security Guide content for Ubuntu (including `ssg-ubuntu2204-ds.xml`) is bundled inside `ssg-debderived`. Removed `ssg-ubuntu` from the install line and added a note that the SSG packages are available in Ubuntu 24.04+ repositories (they do not exist in 22.04 repos).

2. **Unnecessary/version-mismatched `libopenscap8` package.** The library package is `libopenscap8` on 22.04 but renamed to `libopenscap25t64` on noble (24.04). Explicitly listing `libopenscap8` would fail `apt install` on 24.04. Removed it — `openscap-scanner` pulls in the correct library version automatically as a dependency, so the explicit library reference is unnecessary on both versions.

3. **Inverted `oscap` exit code descriptions.** The post listed exit code `1` as "some checks failed" and `2` as "evaluation error". Per the official `oscap` man page, this is reversed: `1` indicates an error during the operation, and `2` indicates the operation succeeded but the assessed system is non-compliant (i.e., some checks failed). Corrected the descriptions.

4. **Broken `oscap xccdf generate fix` command labeled "List only failing rules".** The supplied `--result-id xccdf_org.open-scap.results:xccdf_result` is not a valid TestResult ID (real result IDs look like `xccdf_org.open-scap_testresult_<profile_id>`), so the command would fail. Additionally, `oscap xccdf generate fix` generates remediation scripts, not a list of failing rule IDs. Replaced with an `awk` one-liner that uses `</rule-result>` as the record separator and extracts the `idref` attribute from any `rule-result` containing `<result>fail</result>` — which actually delivers what the comment promised and works without extra dependencies.

## Review Notes

- The XCCDF tailoring file omits the optional `<xccdf:benchmark href="..."/>` element. OpenSCAP will still process the tailoring file correctly when the benchmark is supplied via `--tailoring-file` together with the SSG content path on the command line, so this is acceptable but worth knowing for users who want fully self-describing tailoring files.
- On Ubuntu 22.04, the `ssg-base` and `ssg-debderived` packages are not available in the standard archive — users on 22.04 must build/download SSG content from the ComplianceAsCode/content GitHub release archive. The post implicitly assumes Ubuntu 24.04+ for the APT-based install.
- The Ubuntu noble version of `ssg-debderived` (0.1.71-1 at time of review) does not yet include an `ssg-ubuntu2404-ds.xml` data stream; only 16.04, 18.04, 20.04, and 22.04 streams are bundled. Users wanting to scan a 24.04 host against 24.04-specific content currently need to use either the 22.04 data stream or a newer upstream SSG release.
- The `--result-id ""` usage in the remediation-generation sections is widely accepted by OpenSCAP and is documented in many SSG tutorials; left intact.
- The `grep -c 'result>pass<'` / `'result>fail<'` counters work because OpenSCAP serializes rule outcomes as `<result>pass</result>` / `<result>fail</result>` on contiguous text, but they also match `<override>` blocks that contain the same substrings in rare cases. For typical use this is fine.
