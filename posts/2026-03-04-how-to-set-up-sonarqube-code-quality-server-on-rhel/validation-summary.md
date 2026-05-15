# Validation Summary: How to Set Up SonarQube Code Quality Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SonarQube Server 10.4 Community Edition
- Java 17 / OpenJDK
- PostgreSQL
- systemd
- firewalld
- SonarScanner CLI

## Sources Consulted
- SonarQube Server 10.4 prerequisites: https://docs.sonarsource.com/sonarqube-server/10.4/requirements/prerequisites-and-overview/
- SonarQube Server 10.4 database installation: https://docs.sonarsource.com/sonarqube-server/10.4/setup-and-upgrade/install-the-server/installing-the-database/
- SonarQube Server 10.4 ZIP installation: https://docs.sonarsource.com/sonarqube-server/10.4/setup-and-upgrade/install-the-server/installing-sonarqube-from-zip-file/
- SonarScanner CLI documentation: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner/
- Red Hat Enterprise Linux PostgreSQL configuration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_using_database_servers/index
- PostgreSQL pg_hba.conf documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html

## Issues Found
- The prerequisites said only "PostgreSQL" was required. SonarQube 10.4 requires PostgreSQL 11 or later, and RHEL 8's default PostgreSQL stream can be too old. Updated the text and added a RHEL 8 module note.
- The PostgreSQL setup created a passworded database user but did not configure localhost host authentication for password-based JDBC connections. Added `pg_hba.conf` updates for IPv4 and IPv6 localhost using `scram-sha-256` before starting PostgreSQL.

## Review Notes
- The SonarQube 10.4.1 and SonarScanner CLI 5.0.1 download URLs are still valid, but both versions are old. A future refresh should consider updating the guide to the current SonarQube Server and SonarScanner CLI releases.
- The guide keeps Elasticsearch data under `/opt/sonarqube/data`, which works for a basic setup but is not recommended by SonarSource for production installations.
