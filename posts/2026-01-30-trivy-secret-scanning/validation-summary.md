# Validation Summary: How to Create Trivy Secret Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (Aqua Security) — secret scanning, filesystem/image/repo scanners
- Trivy custom secret rule configuration (`--secret-config`)
- `.trivyignore` and `.trivyignore.yaml` filtering
- aquasecurity/trivy-action GitHub Action
- GitLab CI integration with `aquasec/trivy` image
- SARIF output and GitHub code-scanning upload via `github/codeql-action/upload-sarif`
- Mermaid flowchart diagram

## Sources Consulted
- Trivy Secret Scanner docs: https://trivy.dev/latest/docs/scanner/secret/
- Trivy Configuration File reference: https://trivy.dev/latest/docs/references/configuration/config-file/
- Trivy Filtering / `.trivyignore` docs: https://trivy.dev/latest/docs/configuration/filtering/
- aquasecurity/trivy-action repository: https://github.com/aquasecurity/trivy-action
- AWS Access Key ID prefix list (IAM identifiers reference)
- GitHub token prefix documentation (ghp_/gho_/ghu_/ghs_/ghr_ formats)
- Stripe and SendGrid API key format documentation

## Issues Found
1. **Custom secret rules used wrong field names.** The `Custom Secret Rules Definition` section used `pattern:` and `description:` for each rule entry. Trivy's documented schema requires `regex:` (not `pattern:`) and `title:` (not `description:`). Each rule also requires a `category:` field. Fixed all five custom-rule entries and added appropriate `category:` values (`general` for most, `AsymmetricPrivateKey` for the private-key rule).

2. **"Using Inline Comments" section documented an unsupported feature.** The post claimed `# trivy:ignore:RULE_ID` inline comments suppress secret findings in source files. This syntax is supported for misconfiguration scanning but is **not** documented or supported for the secret scanner. Replaced the section with the documented `.trivyignore` (rule-ID-only) and `.trivyignore.yaml` (rule ID + path scoping) approaches, and renamed the subsection to "Ignoring Specific Rule IDs" to match.

3. **Exclusion config file used fictional fields.** The `trivy-secret-exclusions.yaml` example used top-level `exclude-paths:`, `exclude-rules:`, and `allow-rules:` entries with `value:`/`is_prefix:` fields. None of these exist in Trivy's secret config schema. Replaced with the actual documented format using `disable-rules:` (flat list of rule IDs) and `allow-rules:` whose entries take `id`, `description`, and either `regex` or `path` (a Go regular expression matched against file paths). Reworked each example into a valid path/regex allow-rule.

4. **`trivy.yaml` global config example was malformed.** `skip-files:` was placed under `secret:`, but the global config places it under `scan:`. Additionally, `enable-builtin-rules: true` was shown as a boolean under `secret:`; in reality `enable-builtin-rules` is a **list of rule IDs** and lives in the secret-config file, not in `trivy.yaml`. Moved `skip-files` under `scan:` and replaced the boolean line with a `config:` pointer to the custom secret config.

## Review Notes
- The "Built-in Secret Patterns" section presents YAML snippets that look like configurable rules, but Trivy's built-in patterns are compiled into the binary and not user-editable as YAML. The regexes themselves are reasonable illustrations of what Trivy detects (AWS, GitHub `ghp_/gho_/ghu_/ghs_/ghr_`, Slack `xox[baprs]`, Stripe `sk_(live|test)_`, SendGrid `SG.`, DB URIs), so the section was left as illustrative reference material rather than rewritten.
- The Stripe pattern length (24 chars after the prefix) reflects the historical key format; modern Stripe restricted keys can be longer, but Trivy's built-in rule still matches the documented format, so no change was made.
- The `.trivyignore` example shows path-style entries (`tests/fixtures/*`, `vendor/`, etc.). Strictly, `.trivyignore` consumes finding IDs while `.trivyignore.yaml` is the documented mechanism for path scoping. The post's example is reasonable as a conceptual illustration and is now complemented by the new "Ignoring Specific Rule IDs" subsection which shows both the `.trivyignore` rule-ID format and the `.trivyignore.yaml` path-scoped format.
- The GitHub Actions and GitLab CI snippets, including the `aquasecurity/trivy-action@master` action inputs (`scan-type`, `scanners`, `severity`, `exit-code`, `format`, `output`, `image-ref`) and the `aquasec/trivy:latest` Docker image, are accurate against the current action and image documentation.
