# Validation Summary: How to Use MongoDB in Jenkins Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Jenkins Declarative Pipelines
- Jenkins Shared Libraries
- Docker (docker run, Docker agents)
- Docker Compose V2
- Node.js (test runner context)
- Groovy (Jenkins Pipeline DSL)

## Sources Consulted
- Jenkins Pipeline Syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Docker Pipeline Plugin documentation: https://plugins.jenkins.io/docker-workflow/
- Jenkins Shared Libraries documentation: https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Official MongoDB Docker image documentation: https://hub.docker.com/_/mongo
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- Docker Compose CLI reference (V2): https://docs.docker.com/compose/reference/
- Jenkins JUnit Plugin documentation: https://plugins.jenkins.io/junit/

## Issues Found
1. **Deprecated `version` field in Docker Compose file**: The `docker-compose.test.yml` included `version: "3.8"`, which is deprecated in Docker Compose V2. Since the Jenkinsfile uses the `docker compose` command (V2), this field is obsolete and ignored with a warning. Removed the `version: "3.8"` line.

## Review Notes
- The declarative pipeline example assumes the Docker CLI is accessible from within the Docker agent container (`node:20-alpine`). This is a common pattern when the Jenkins Docker Pipeline plugin is configured to mount the Docker socket, but may require additional `args` (e.g., `-v /var/run/docker.sock:/var/run/docker.sock`) depending on the Jenkins installation. The post doesn't mention this prerequisite.
- The test artifact example (`--reporter junit --reporter-options output=test-results.xml`) uses Mocha-specific CLI flags but doesn't explicitly mention Mocha as the test runner. This is fine as an example but readers using other test runners would need different flags.
- The `--reporter-option` (singular) form is the currently documented Mocha flag, though the plural `--reporter-options` still works for backward compatibility.
