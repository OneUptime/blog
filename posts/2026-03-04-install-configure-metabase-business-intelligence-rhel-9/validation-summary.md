# Validation Summary: How to Install and Configure Metabase for Business Intelligence on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Metabase
- Java / OpenJDK
- PostgreSQL
- systemd
- Nginx
- firewalld
- cron

## Sources Consulted
- Metabase documentation: Running the Metabase OSS JAR file: https://www.metabase.com/docs/latest/installation-and-operation/running-the-metabase-jar-file
- Metabase documentation: Configuring the Metabase application database: https://www.metabase.com/docs/latest/installation-and-operation/configuring-application-database
- Metabase documentation: Environment variables: https://www.metabase.com/docs/latest/configuring-metabase/environment-variables
- Red Hat documentation: Installing and using Red Hat build of OpenJDK 21 on RHEL: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html-single/installing_and_using_red_hat_build_of_openjdk_21_on_rhel/index
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/
- Metabase GitHub releases: https://github.com/metabase/metabase/releases

## Issues Found
- The post said Metabase required Java 11 or later and installed OpenJDK 17. Current Metabase documentation requires Java 21 or higher, so the prerequisite, explanatory text, and install command were updated to OpenJDK 21.
- The PostgreSQL install command used the default RHEL 9 PostgreSQL package, which installs PostgreSQL 13. PostgreSQL 13 is end-of-life upstream as of 2026, and current Metabase supports supported PostgreSQL versions. The command was changed to install the RHEL 9 PostgreSQL 16 module stream.
- The post described downloading the latest Metabase JAR but hardcoded the outdated `v0.48.0` URL. The command now uses Metabase's latest JAR download URL.
- The systemd service ran `java -jar` without the `--add-opens java.base/java.nio=ALL-UNNAMED` option shown in current Metabase JAR documentation. The service command was updated.
- The cron backup script used `pg_dump -U metabase -h localhost` without providing a password, which would fail in a noninteractive cron job on a password-authenticated PostgreSQL connection. The script now loads `/etc/sysconfig/metabase` and passes `PGPASSWORD` from `MB_DB_PASS`.

## Review Notes
- The guide still uses placeholder secrets and hostnames. Operators should replace them with generated secrets, production credentials, and TLS configuration before real deployment.
- The `postgresql:16` module stream requires RHEL 9.4 or later according to Red Hat documentation; older RHEL 9 minor versions may need PostgreSQL 15 or a newer RHEL minor release.
