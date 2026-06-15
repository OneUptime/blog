# Validation Summary: How to Implement SAST with SonarQube

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SonarQube Server and SonarQube Community Build
- SonarScanner CLI
- SonarScanner for Maven
- SonarScanner for NPM
- Docker Compose
- Kubernetes and Helm
- GitHub Actions
- GitLab CI/CD
- Python, Java, and JavaScript security examples

## Sources Consulted
- SonarQube Server Docker installation: https://docs.sonarsource.com/sonarqube-server/server-installation/from-docker-image/set-up-and-start-container
- Official SonarQube Docker image documentation: https://hub.docker.com/_/sonarqube
- SonarQube Helm chart documentation: https://github.com/SonarSource/helm-chart-sonarqube/tree/master/charts/sonarqube
- SonarQube Helm chart repository: https://SonarSource.github.io/helm-chart-sonarqube
- SonarScanner CLI documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner
- SonarQube analysis parameters: https://docs.sonarsource.com/sonarqube-server/2025.4/analyzing-source-code/analysis-parameters
- SonarScanner for Maven documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner-for-maven
- SonarScanner for NPM documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/npm/using
- SonarScanner for NPM configuration documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/npm/configuring
- SonarQube GitHub Actions integration documentation: https://docs.sonarsource.com/sonarqube-server/2025.1/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow
- SonarQube branch analysis documentation: https://docs.sonarsource.com/sonarqube-server/10.3/analyzing-source-code/branches/branch-analysis
- SonarQube pull request analysis documentation: https://docs.sonarsource.com/sonarqube-server/2025.1/analyzing-source-code/pull-request-analysis/setting-up-the-pull-request-analysis
- SonarQube supported languages documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/overview
- npm package metadata for @sonar/scan: https://www.npmjs.com/package/@sonar/scan

## Issues Found
- Updated the Docker image tag from `sonarqube:10-community` to the current official `sonarqube:community` tag for Community Build examples.
- Replaced `docker-compose up -d` with the current Docker Compose v2 command, `docker compose up -d`.
- Clarified that language support depends on the SonarQube edition, because Community Build and commercial SonarQube Server do not expose the same language set.
- Corrected the project token instructions to point to the account Security page instead of a generic Settings page.
- Updated the SonarScanner CLI Linux download example from the old 5.0.1 release to the current documented 8.0.1 Linux x64 package.
- Updated the Maven scanner example from the older `3.10.0.2594` plugin and direct `<plugins>` snippet to the documented `pluginManagement` pattern with `5.5.0.6356`, and used the fully qualified Maven scanner goal.
- Replaced the outdated NPM scanner example with the current `@sonar/scan` package and made the `npm run sonar` script execute the shown `sonar-project.js` file.
- Updated GitHub Actions examples from floating `@master` refs to current versioned action tags and updated `actions/cache` to v4.
- Changed the GitHub Actions JDK setup from Java 17 to Java 21 to match current SonarScanner runtime guidance.
- Corrected the Helm install example for current chart behavior by using `helm upgrade --install`, enabling `community.enabled=true`, and removing the obsolete `postgresql.enabled=true` setting.
- Added the edition caveat that branch analysis and pull request analysis require SonarQube Developer Edition or higher.

## Review Notes
The article is technically relevant and useful as a SAST implementation guide. The remaining examples are intentionally minimal and assume project-specific test, coverage, and database setup outside the snippets.
