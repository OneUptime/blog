# Validation Summary: How to Implement Testing in Jenkins Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins (declarative pipelines, matrix builds, parallel stages)
- Maven (Surefire, Failsafe plugins)
- JaCoCo (code coverage)
- Docker / Docker Compose
- PostgreSQL, Redis, RabbitMQ (test infrastructure)
- Allure (test reporting)
- Node.js / npm / Jest (jest-junit reporter)
- Python / pytest / pytest-cov / Cobertura
- Selenium (standalone-chrome Docker image)
- Playwright (mcr.microsoft.com/playwright image)
- k6 (load testing)
- Testcontainers (Java)
- OWASP Dependency Check, Semgrep, TruffleHog (security tools)
- Flyway (database migrations)
- Slack / Email notifications (emailext, slackSend)

## Sources Consulted
- Jenkins Pipeline Syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Declarative Pipeline matrix: https://www.jenkins.io/doc/book/pipeline/syntax/#declarative-matrix
- JaCoCo Jenkins Plugin: https://plugins.jenkins.io/jacoco/
- Maven Surefire Plugin (rerunFailingTestsCount): https://maven.apache.org/surefire/maven-surefire-plugin/
- k6 documentation — summary export JSON format: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- Playwright JUnit reporter: https://playwright.dev/docs/test-reporters#junit-reporter
- jest-junit: https://github.com/jest-community/jest-junit
- Allure Maven Plugin: https://allurereport.org/docs/maven/
- Docker Compose Compose Specification: https://compose-spec.io/
- Testcontainers PostgreSQL module: https://java.testcontainers.org/modules/databases/postgres/
- Cobertura Jenkins Plugin: https://plugins.jenkins.io/cobertura/
- OWASP Dependency-Check Maven plugin: https://jeremylong.github.io/DependencyCheck/dependency-check-maven/
- Semgrep CLI reference: https://semgrep.dev/docs/cli-reference/
- TruffleHog: https://github.com/trufflesecurity/trufflehog

## Issues Found
1. **k6 summary JSON property access (Performance Testing section)** — The Groovy snippet read `summary.metrics.http_req_duration.p95`, but the k6 `--summary-export` JSON uses the key `p(95)` (with parentheses) for the 95th percentile. Dot access in Groovy on that key returns `null`, which would then NPE on the `>` comparison. Fixed to use bracket notation: `summary.metrics.http_req_duration['p(95)']` with a short comment explaining the key format.

## Review Notes
- The k6 `--summary-export` flag still works but has been deprecated in newer k6 versions (≥0.47) in favor of the `handleSummary()` callback exported from the test script. The current code works against contemporary k6 but may show a deprecation notice; readers migrating away from `--summary-export` would replace it with `handleSummary()` writing a custom JSON.
- The Cobertura Jenkins plugin is in maintenance-only mode; the modern replacement is the Jenkins **Coverage** plugin (`recordCoverage(...)`). The shown code still functions, so this is a forward-looking note, not an error.
- The `version: '3.8'` line in the Docker Compose file is harmless but obsolete under the Compose Specification (the field is now ignored). Leaving in place since it doesn't affect correctness.
- The Playwright `--reporter=junit` invocation writes XML to stdout by default. To produce `test-results/results.xml` as `junit 'test-results/results.xml'` expects, readers need to set `PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results/results.xml` (env var) or configure the reporter with an `outputFile` in `playwright.config.ts`. The example assumes this configuration is in place, which is a common pattern — not strictly incorrect but worth knowing.
- The `docker.image('docker/compose:latest').inside { ... }` pattern in the complete pipeline relies on the (now-archived) `docker/compose` image. Modern setups use Docker CLI's built-in `docker compose` (no hyphen) plugin directly on the agent. Functional but dated.
- JaCoCo plugin's `maximumLineCoverage`/`maximumBranchCoverage` are correct — they define the upper bound of the "yellow→green" range used by the plugin's status reporting, not a coverage cap.
