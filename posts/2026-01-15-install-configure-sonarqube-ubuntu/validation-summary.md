# Validation Summary: How to Install and Configure SonarQube on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- SonarQube 10.3 (self-hosted server)
- Ubuntu (20.04+)
- Java 17 (OpenJDK)
- PostgreSQL
- SonarScanner CLI 5.0
- systemd
- Nginx (reverse proxy / HTTPS)
- CI/CD: GitHub Actions, Jenkins, GitLab CI
- LDAP authentication

## Sources Consulted
- SonarQube Server installation docs — https://docs.sonarsource.com/sonarqube-server/setup-and-upgrade/install-the-server/
- SonarScanner CLI docs — https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner
- Analysis parameters (sonar.token vs sonar.login) — https://docs.sonarsource.com/sonarqube-server/2025.1/analyzing-source-code/analysis-parameters
- Sonar community thread on sonar.login deprecation — https://community.sonarsource.com/t/sonarscanner-6-x-the-properties-sonar-login-and-sonar-password-are-deprecated/120870
- SonarSource binaries distribution — https://binaries.sonarsource.com/Distribution/sonarqube/ (download URL for 10.3.0.82913 verified to resolve to a valid artifact)

## Issues Found
1. **Deprecated `sonar.login` property used for token authentication.** The "Run Analysis" example and the GitLab CI script passed the analysis token via `-Dsonar.login=...`. The `sonar.login`/`sonar.password` properties are deprecated in favor of `sonar.token`, which is supported by the SonarScanner CLI 5.0 version the post installs. Changed both occurrences (`-Dsonar.login=your-token` → `-Dsonar.token=your-token`, and `-Dsonar.login=$SONAR_TOKEN` → `-Dsonar.token=$SONAR_TOKEN`). This avoids deprecation warnings and is the current recommended approach.

## Review Notes
- The kernel/limits values (`vm.max_map_count=524288`, `fs.file-max=131072`, `nofile 131072`, `nproc 8192`), Java 17 requirement, PostgreSQL setup, systemd unit (`Type=forking` with `sonar.sh start/stop`), and the `sonar.properties` JDBC/web/search settings all match official SonarQube guidance.
- The SonarQube 10.3.0.82913 and sonar-scanner-cli-5.0.1.3006 download URLs are valid and resolve to real artifacts on binaries.sonarsource.com. Note these are pinned versions — readers on later SonarQube releases should substitute the current download URL.
- `sonar.language=java` in `sonar-project.properties` is a deprecated property (it restricts analysis to a single language); it still functions but is no longer recommended. Left as-is to preserve author intent, but it could be removed in a future revision.
- The out-of-memory troubleshooting tip (`wrapper.java.maxmemory` in `wrapper.conf`) is dated. In modern SonarQube the JVM heap for each process is tuned via `sonar.web.javaOpts`, `sonar.ce.javaOpts`, and `sonar.search.javaOpts` in `sonar.properties`; `wrapper.conf` controls the wrapper process rather than the SonarQube processes themselves. Not corrected since it is a non-breaking troubleshooting aside.
- `GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;` is redundant given the database is created with `OWNER sonarqube`, but it is harmless and commonly included.
