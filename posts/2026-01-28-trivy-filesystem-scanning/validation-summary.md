# Validation Summary: How to Use Trivy for Filesystem Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy filesystem scanning
- Trivy vulnerability, misconfiguration, secret, and license scanners
- Trivy YAML configuration
- GitHub Actions with aquasecurity/trivy-action
- pre-commit hooks
- JSON, SARIF, and template report output
- Node.js, Python, Go, Java, and Ruby dependency scanning

## Sources Consulted
- Trivy filesystem target documentation: https://trivy.dev/docs/latest/target/filesystem/
- Trivy filesystem CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_filesystem/
- Trivy configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy language coverage documentation: https://trivy.dev/docs/latest/coverage/language/nodejs/
- Trivy language coverage overview: https://trivy.dev/docs/latest/coverage/language/
- Trivy secret scanning documentation: https://trivy.dev/docs/latest/scanner/secret/
- Trivy license scanning documentation: https://trivy.dev/docs/latest/scanner/license/
- Trivy clean CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_clean/
- aquasecurity/trivy-action documentation and action metadata: https://github.com/aquasecurity/trivy-action
- pre-commit official documentation: https://pre-commit.com/

## Issues Found
- The post described vulnerability scanning as the default scanner mode. Current Trivy filesystem scanning enables vulnerability and secret scanning by default, so the scanner option comment was changed to "Vulnerabilities only."
- The Node.js section said Trivy scans package.json directly for npm vulnerabilities. Current Trivy filesystem/repository scanning relies on lock files for npm vulnerability detection and uses package.json for metadata in some cases, so the wording and file list were corrected.
- Several language file coverage examples listed unsupported filesystem-scan inputs: setup.py, go.sum, build.gradle, and .gemspec files. These were replaced or removed to match Trivy's documented filesystem coverage.
- The trivy.yaml example placed skip-dirs and skip-files at the top level. Current Trivy config maps these under scan, so the YAML nesting was corrected.
- The pre-commit example used the deprecated stage name commit. It was changed to pre-commit to match current pre-commit stage names.
- The jq command could fail when a result has no Vulnerabilities array. It was changed to use the optional iterator and read the JSON file directly.
- The custom secret regex YAML used single-quoted strings containing an unescaped single quote, which made the YAML invalid. The regex values were changed to valid double-quoted YAML strings with escaped backslashes.
- The license policy comments implied forbidden licenses automatically fail scans and restricted licenses are warnings. Trivy maps license classes to severities, so the comments were corrected to CRITICAL and HIGH classifications.
- The troubleshooting command used trivy fs --reset, which is not a current Trivy filesystem option. It was replaced with trivy clean --vuln-db followed by trivy fs .

## Review Notes
Trivy was not installed in the local environment, so CLI behavior was verified against current official Trivy documentation and the official trivy-action metadata rather than local --help output.
