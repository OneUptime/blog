# Validation Summary: How to Build DAST Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dynamic Application Security Testing (DAST)
- OWASP ZAP / ZAP Automation Framework
- Burp Suite DAST / Burp Suite Enterprise API
- OpenAPI and GraphQL API scanning
- OAuth 2.0 and JWT-based authentication
- GitHub Actions
- GitLab CI/CD
- SARIF reporting
- Python, JavaScript, YAML, Docker Compose

## Sources Consulted
- OWASP ZAP Automation Framework authentication documentation: https://www.zaproxy.org/docs/desktop/addons/automation-framework/authentication/
- OWASP ZAP Automation Framework active scan job documentation: https://www.zaproxy.org/docs/desktop/addons/automation-framework/job-ascan/
- OWASP ZAP AJAX Spider Automation Framework documentation: https://www.zaproxy.org/docs/desktop/addons/ajax-spider/automation/
- OWASP ZAP OpenAPI Automation Framework documentation: https://www.zaproxy.org/docs/desktop/addons/openapi-support/automation/
- OWASP ZAP Report Generation Automation Framework/API documentation: https://www.zaproxy.org/docs/desktop/addons/report-generation/automation/ and https://www.zaproxy.org/docs/desktop/addons/report-generation/api/
- OWASP ZAP Docker full scan documentation: https://www.zaproxy.org/docs/docker/full-scan/
- ZAP GitHub Action documentation: https://github.com/zaproxy/action-baseline, https://github.com/zaproxy/action-full-scan, https://github.com/zaproxy/action-api-scan
- PortSwigger Burp Suite DAST CI/CD and REST API scan definition documentation: https://portswigger.net/burp/documentation/dast/user-guide/ci-cd/plugins/optional-settings
- GitLab CI/CD SARIF artifact report documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GraphQL introspection type reference behavior, checked against the GraphQL specification: https://spec.graphql.org/

## Issues Found
- ZAP form authentication examples used outdated `loginUrl` and `loginRequestData` fields. Updated them to `loginPageUrl`, `loginRequestUrl`, and `loginRequestBody`.
- The form-auth example included an unsupported `{%csrf%}` placeholder in the request body. Removed it from the minimal example.
- The Burp Suite DAST API client used a bearer `Authorization` header and an incomplete scan definition. Updated it to use the API link style documented by PortSwigger and added `name`, `scope`, and `type: NamedConfiguration`.
- The GraphQL scanner did not unwrap `NonNull`/`List` introspection types, so common arguments such as `String!` would be skipped. Added nested `ofType` fields to the introspection query and helper logic to resolve the underlying type name.
- The OAuth ZAP example returned only the token string from the authentication script and used HTTP auth session management. Updated it to return the authentication message and use header-based session management to extract `access_token`.
- The GitHub Actions workflow pinned older ZAP action versions and referenced a `results.sarif` file that those actions do not create. Updated the action versions and used `fail_action: true` instead of parsing a nonexistent SARIF file.
- The GitLab CI example declared a SARIF file as a `sast` report. Updated it to use GitLab's `sarif` report artifact type.
- The false-positive manager used `datetime.now()` without importing `datetime`. Added the missing import.
- The custom ZAP orchestrator attempted to fetch SARIF from the report-generation endpoint as response content. Updated it to call the report generation API and write reports into the mounted ZAP reports directory.

## Review Notes
The examples are still illustrative and need real target-specific tuning for authentication, scan scope, and rule policies. ZAP active scans can be destructive and should remain limited to authorized staging or test environments.
