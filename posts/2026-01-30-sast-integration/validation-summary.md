# Validation Summary: How to Implement SAST Integration

## Status
validated

## Post Type
Tutorial / Guide — practical implementation walkthrough with code, config, and CI/CD examples for SonarQube and Semgrep.

## Technologies Covered
- SonarQube (Community Edition, LTS) — quality gates, scanner, project properties
- Semgrep — pattern-based SAST, custom rules, rule packs
- PostgreSQL 15 (as SonarQube backing store)
- Docker / Docker Compose
- GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `SonarSource/sonarqube-scan-action`, `SonarSource/sonarqube-quality-gate-action`, `github/codeql-action/upload-sarif`, `trufflesecurity/trufflehog`)
- pre-commit framework
- SARIF format
- Python (`requests`, `datetime`) for metrics scripting

## Sources Consulted
- SonarQube Analysis Parameters / Project Configuration: https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/analysis-parameters/
- SonarSource community thread on `sonar.language` deprecation: https://community.sonarsource.com/t/what-is-the-alternative-to-the-sonar-language-property-in-the-current-version-of-sonarqube/3993
- SonarQube custom Java rules guide: https://docs.sonarsource.com/sonarqube-server/latest/extension-guide/adding-coding-rules/
- SonarQube rule `S2068` (hardcoded credentials): https://rules.sonarsource.com/javascript/RSPEC-2068/
- Semgrep rule syntax reference: https://semgrep.dev/docs/writing-rules/rule-syntax
- Semgrep CI / running Semgrep in CI: https://semgrep.dev/docs/semgrep-ci/overview
- Semgrep Docker image: https://hub.docker.com/r/semgrep/semgrep
- `returntocorp/semgrep-action` deprecation notice: https://github.com/returntocorp/semgrep-action
- GitHub `codeql-action` versioning / v2 retirement: https://github.blog/changelog/2025-01-10-code-scanning-codeql-action-v2-is-now-deprecated/
- trufflehog GitHub Action `action.yml`: https://github.com/trufflesecurity/trufflehog/blob/main/action.yml
- pre-commit hook configuration: https://pre-commit.com/

## Issues Found

1. **`sonar.language=js` (deprecated property)** — Removed. This property has been deprecated since SonarQube 4.2 and is silently ignored since 7.7. SonarQube auto-detects languages. Replaced the surrounding comment to reflect this.

2. **`.semgrep.yml` mixed pack references with custom rule objects in the `rules:` list** — Per Semgrep's rule syntax spec, every item under `rules:` must be a full rule object. The strings `p/security-audit`, `p/secrets`, and `p/owasp-top-ten` belong as `--config` flags on the CLI (which the post already does in the following section), not as bare list items. Removed them from the `rules:` list and added a one-line explanation directing readers to the CLI invocation.

3. **`returntocorp/semgrep` Docker image** — Replaced with `semgrep/semgrep`, the documented canonical name. The old name still resolves but is no longer the official path.

4. **`returntocorp/semgrep-action@v1` GitHub Action** — This action is explicitly deprecated by Semgrep; the recommended approach is to run `semgrep ci` directly. Replaced the `uses:` step with a `run:` step that invokes `semgrep ci` inside the `semgrep/semgrep` container.

5. **`github/codeql-action/upload-sarif@v2`** — v2 was retired in January 2025. Updated to `@v3` (v3 is still supported; v4 also exists but v3 remains the broadly compatible choice).

6. **Fabricated `.semgrep/settings.yml` block** — The example used `severity_threshold:` and per-rule `fail_open:` keys that do not exist in Semgrep. Replaced the snippet with the actual mechanism: per-rule `severity:` metadata combined with the `--severity` CLI flag, plus a `semgrep ci` example.

7. **Misleading SonarQube custom-rule claim** — "SonarQube uses XPath-based rules for custom patterns" is incorrect for Java (the language of the example shown). Java custom rules are written as a SonarQube plugin against the Java AST (`org.sonar.plugins.java.api`); XPath is an option for XML and a few other languages. Rewrote the sentence to describe the Java plugin approach and clarify that the XML snippet is the rule metadata descriptor.

8. **`https://github.com/returntocorp/semgrep` pre-commit repo URL** — Updated to `https://github.com/semgrep/semgrep`, the current canonical URL.

## Review Notes

- `SonarSource/sonarqube-scan-action@master` and `SonarSource/sonarqube-quality-gate-action@master` work but pinning to a tagged release (e.g., `@v3` / `@v2`) is preferable for reproducibility. Left as-is to avoid stylistic changes.
- `version: "3.8"` in `docker-compose.yml` is obsolete in Docker Compose V2 (the field is ignored with a warning) but not broken. Left as-is.
- `new_critical_violations` is a legacy SonarQube quality-gate metric. Newer SonarQube versions have moved toward Clean Code / impact-based conditions (`new_violations` with severity/impact filters). The metric still functions on current servers, so the example remains accurate for the audience using established quality gates; flagging here as a forward-looking note.
- The Python `datetime.fromisoformat(... .replace("Z", ""))` pattern assumes SonarQube returns either `Z`-suffixed or offset-suffixed timestamps. SonarQube actually returns `+0000`-style offsets that `fromisoformat` handles on Python 3.11+. Functionally OK for the illustrative script.
- The Semgrep ellipsis patterns (`"sk_live_..."`, etc.) are valid Semgrep syntax (string ellipsis match).
- `javascript:S2068` is verified as a real, current SonarSource rule ("Credentials should not be hard-coded").
