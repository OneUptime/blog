# Validation Summary: How to Run SonarQube in Docker for Code Quality

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- SonarQube Server / Community Edition
- Docker and Docker Compose
- PostgreSQL
- SonarScanner CLI
- GitHub Actions
- SonarQube Web API
- SonarQube plugins

## Sources Consulted
- SonarQube Server 10.7 Linux pre-installation requirements: https://docs.sonarsource.com/sonarqube-server/10.7/setup-and-upgrade/pre-installation/linux
- SonarQube official Docker image documentation: https://hub.docker.com/_/sonarqube/
- SonarQube Server 10.7 database requirements: https://docs.sonarsource.com/sonarqube-server/10.7/setup-and-upgrade/installation-requirements/database-requirements/
- SonarScanner CLI documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner
- SonarScanner CLI Docker image documentation: https://hub.docker.com/r/sonarsource/sonar-scanner-cli
- SonarSource sonarqube-scan-action releases: https://github.com/SonarSource/sonarqube-scan-action/releases
- SonarSource sonarqube-quality-gate-action documentation: https://github.com/SonarSource/sonarqube-quality-gate-action
- SonarQube quality gates documentation: https://docs.sonarsource.com/sonarqube/latest/user-guide/quality-gates
- SonarQube Web API quality gates endpoint reference: https://next.sonarqube.com/sonarqube/web_api/api/qualitygates
- Docker Compose file reference for the obsolete top-level version element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker host networking documentation: https://docs.docker.com/engine/network/drivers/host/
- mc1arke community branch plugin documentation: https://github.com/mc1arke/sonarqube-community-branch-plugin

## Issues Found
- The Docker Compose example used `postgres:16-alpine` with `sonarqube:10.7-community`. SonarQube Server 10.7 supports PostgreSQL 11 through 15, so the example was changed to `postgres:15-alpine`.
- The Compose snippet included `version: "3.8"`. Docker Compose treats the top-level `version` property as obsolete, so it was removed.
- The first scanner command included `-Dsonar.language=java`, a deprecated analysis parameter that should not be used in new analyses. It was removed; SonarQube detects supported languages from the source files.
- The GitHub Actions example used `sonarsource/sonarqube-scan-action@v3`, which is no longer current. It was updated to `sonarsource/sonarqube-scan-action@v8`, matching the current major release line.
- The plugin installation example downloaded the community branch plugin as a plain JAR and restarted SonarQube. That plugin requires additional javaagent and webapp setup, so the example was changed to the generic supported pattern of copying a downloaded plugin JAR into `/opt/sonarqube/extensions/plugins`.

## Review Notes
The Docker scanner examples use `--network host`, which is valid on Linux and available as an opt-in Docker Desktop feature in recent Docker Desktop releases. On Docker Desktop setups where host networking is not enabled, users should use Docker Desktop's host access mechanisms such as `host.docker.internal` instead.
