# Validation Summary: How to Implement API Mocking with WireMock

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- WireMock
- API mocking
- Service virtualization
- Java
- JUnit 5
- Docker
- Docker Compose
- Maven
- JSON and JSONC stub mappings

## Sources Consulted
- WireMock Download and Installation documentation: https://wiremock.org/docs/download-and-installation/
- WireMock Request Matching documentation: https://wiremock.org/docs/request-matching/
- WireMock Response Templating documentation: https://wiremock.org/docs/response-templating/
- WireMock Simulating Faults documentation: https://wiremock.org/docs/simulating-faults/
- WireMock Stateful Behaviour documentation: https://wiremock.org/docs/stateful-behaviour/
- WireMock JUnit 5 Jupiter documentation: https://wiremock.org/docs/junit-jupiter/
- WireMock Running in Docker documentation: https://wiremock.org/docs/standalone/docker/

## Issues Found
- Updated WireMock version references from `3.3.1` to the current documented 3.x version, `3.13.2`, in the standalone JAR URL, Java commands, Docker image tags, Maven dependency, and Docker Compose example.
- Removed `//` comments from actual JSON mapping/file examples because JSON stub files and `__files` payloads must be valid JSON.
- Changed illustrative JSON examples with inline explanatory comments to `jsonc` fences so the snippets are not mislabeled as strict JSON.
- Replaced the unsupported `urlPathPrefix` matcher with `urlPathPattern": "/api/.*"`, which is a documented WireMock path regex matcher.
- Split the URL matching sample into separate request snippets so it no longer shows multiple alternative URL matchers in the same stub request object.
- Corrected response template header references from dot notation to bracket notation for header names containing hyphens, e.g. `request.headers.[User-Agent]`.
- Added the missing `TimeoutException` import to the Java JUnit example.
- Updated the Docker Compose WireMock startup configuration to use the documented Docker entrypoint array form for passing WireMock command-line options.

## Review Notes
The Java test example still assumes application-specific `UserService`, `User`, and `ServerException` classes exist in the project under test. That is acceptable for the tutorial context, but a future revision could make this dependency explicit.
