# Validation Summary: How to Create License Compliance Testing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Open source license compliance testing
- SBOMs, SPDX, and CycloneDX
- Syft
- Grype
- Trivy
- FOSSA CLI
- license-checker for Node.js
- pip-licenses for Python
- go-licenses for Go
- ScanCode Toolkit
- GitHub Actions
- jq
- Python

## Sources Consulted
- FOSSA `.fossa.yml` reference: https://github.com/fossas/fossa-cli/blob/master/docs/references/files/fossa-yml.md
- license-checker README and CLI options: https://github.com/davglass/license-checker
- Anchore Syft output formats: https://oss.anchore.com/docs/guides/sbom/formats/
- Anchore Grype README and SBOM scanning examples: https://github.com/anchore/grype
- pip-licenses documentation on PyPI: https://pypi.org/project/pip-licenses/
- go-licenses README: https://github.com/google/go-licenses
- Trivy SBOM documentation: https://trivy.dev/docs/latest/target/sbom/
- ScanCode Toolkit CLI reference: https://scancode-toolkit.readthedocs.io/en/latest/reference/scancode-cli/index.html
- SPDX License List: https://spdx.org/licenses/
- NIST SBOM guidance under EO 14028: https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-supply-chain-security-guidance-20
- NTIA Minimum Elements for SBOM: https://www.ntia.gov/sites/default/files/publications/sbom_minimum_elements_report_0.pdf
- actions/github-script README: https://github.com/actions/github-script

## Issues Found
- The Licensee row described it as a Ruby dependency license scanner with Markdown output. Licensee primarily detects project license files and supports text/JSON-style CLI output, so the row was corrected to avoid implying dependency-tree scanning.
- The go-licenses row claimed JSON output and SBOM support. The official README documents CSV reports and custom templates, not SBOM generation, so the row was corrected.
- The FOSSA example used unsupported top-level `policy.allowlist`, `policy.flaglist`, and `policy.denylist` keys in `.fossa.yml`. FOSSA CLI configuration supports assigning a named project policy, so the snippet now assigns `project.policy` and notes that allow/flag/deny rules are defined in FOSSA.
- The license-checker JSON example used a `licenseCheckerConfig` object that the documented CLI does not consume. It was replaced with a valid `package.json` script using documented `--onlyAllow`, `--excludePackages`, and `--failOn` flags with semicolon-delimited lists.
- The SBOM benefits list said SBOMs are required by regulations like EO 14028. EO 14028 and related NTIA/CISA materials define and promote SBOM practices, but that phrasing was too broad, so it was changed to say SBOMs align with that guidance.
- The SBOM scanning script ran Grype before extracting licenses. Grype is a vulnerability scanner; the example did not use its output for license policy enforcement. The unused Grype command was removed, and the jq expression was updated to read CycloneDX license IDs, expressions, and names.
- The shell loop split license values on whitespace. It now reads licenses line-by-line so values such as license names with spaces are not broken apart.
- The GitHub Actions workflow only checked `.license.id`, missing CycloneDX license expressions and names. The jq expression was updated to cover the same fields as the standalone script.
- The GitHub Actions notification step ran on all failures, including push events where `context.issue.number` is not available. It now runs only for pull request events.
- The GitHub Actions workflow installed jq without updating apt metadata. It now runs `sudo apt-get update` before `sudo apt-get install -y jq`.
- The Python example used `set[str] = None` annotations and substring license matching, which could incorrectly allow or deny licenses. The annotations now use `Optional[set[str]]`, and the checker tokenizes common license expressions before comparing them to policy sets.

## Review Notes
- The license risk categories are intentionally simplified for a technical blog post. Real production policy decisions should be reviewed by legal counsel, especially for copyleft linking, SaaS/network-use obligations, exceptions, and dual-license expressions.
- The Python example validates syntax, but pip-licenses output still depends on package metadata quality and may return human-readable license strings rather than precise SPDX identifiers.
