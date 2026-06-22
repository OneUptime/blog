# Validation Summary: How to Fix 'Security Compliance' Pipeline Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CI/CD security pipelines
- SAST and DAST
- SQL parameterized queries in Python and Node.js
- Express.js, Helmet, and express-session
- npm audit and package.json overrides
- pip-audit and Python package updates
- Snyk policy files
- Gitleaks
- git-filter-repo
- Docker, Node.js container images, and distroless images
- Trivy
- GitLab CI/CD
- AWS Secrets Manager with Boto3

## Sources Consulted
- OWASP Source Code Analysis Tools: https://owasp.org/www-community/Source_Code_Analysis_Tools
- Psycopg parameter binding documentation: https://www.psycopg.org/psycopg3/docs/basic/params.html
- node-postgres parameterized query documentation: https://node-postgres.com/features/queries
- Express security best practices: https://expressjs.com/en/advanced/best-practice-security/
- Express session middleware documentation: https://expressjs.com/en/resources/middleware/session/
- Helmet documentation: https://helmetjs.github.io/
- npm audit documentation: https://docs.npmjs.com/cli/v8/commands/npm-audit/
- npm package.json overrides documentation: https://docs.npmjs.com/cli/v8/configuring-npm/package-json/
- pip-audit project documentation: https://pypi.org/project/pip-audit/
- Snyk .snyk file documentation: https://docs.snyk.io/scan-fix-and-prevent/prevent/policies/the-.snyk-file
- AWS Secrets Manager Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager.html
- git-filter-repo documentation: https://github.com/newren/git-filter-repo/blob/master/Documentation/git-filter-repo.txt
- Gitleaks usage documentation: https://github.com/gitleaks/gitleaks
- Docker Node official image documentation: https://hub.docker.com/_/node
- Google distroless Node.js image documentation: https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- Semgrep CLI reference: https://docs.semgrep.dev/cli-reference

## Issues Found
- The Python SQL example described parameterized values as "escaped." Updated the wording to "safely bound" to match how DB-API style parameter binding is documented.
- The AWS Secrets Manager example imported `get_secret` from `aws_secretsmanager`, which is not the official AWS SDK interface. Replaced it with a Boto3 Secrets Manager client using `get_secret_value` and JSON parsing of `SecretString`.
- The container examples used Node.js 20 images. Node.js 20 is EOL as of 2026, so the examples were updated to supported Node.js 24 images.
- The distroless image example used `gcr.io/distroless/nodejs20-debian12`, which is no longer a current supported distroless Node.js image. Updated it to `gcr.io/distroless/nodejs24-debian13`.
- The multi-stage Docker example copied `node_modules` from a Debian-based builder into an Alpine runtime image, which can break native dependencies. Updated the builder to use the matching `node:24-alpine` base.
- The GitLab CI Gitleaks example used `gitleaks detect --source . --verbose`; Gitleaks v8.19.0 deprecated and hid `detect`. Updated the command to the current `gitleaks git -v .` form.

## Review Notes
- The Semgrep example remains technically valid, though current Semgrep docs also show `semgrep scan --config auto` as the explicit modern form.
