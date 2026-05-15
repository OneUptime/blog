# Validation Summary: How to Run MariaDB and MySQL Simultaneously Using Containers on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- MariaDB containers
- MySQL containers
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Building, running, and managing containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_working-with-containers_building-running-and-managing-containers
- Red Hat Enterprise Linux 9 documentation, "Configuring and using database servers": https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/
- MariaDB documentation, "MariaDB Server Docker Official Image Environment Variables": https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables
- MySQL 8.0 Installation Guide, "Deploying MySQL on Linux with Docker": https://dev.mysql.com/doc/refman/8.0/en/docker-mysql-more-topics.html
- Red Hat Ecosystem Catalog, "MySQL 8.0": https://catalog.redhat.com/en/software/containers/rhel9/mysql-80/61a60915c17162a20c1c6a34
- Red Hat Ecosystem Catalog, "MariaDB 10.5": https://catalog.redhat.com/en/software/containers/rhel9/mariadb-105/61a6084dbfd4a5234d596220

## Issues Found
- Corrected the final summary capitalization from "mariadb and mysql" to "MariaDB and MySQL" to use the official product names.

## Review Notes
The container workflow is technically sound: MariaDB and MySQL can run simultaneously because each container has its own filesystem and process space, while the host maps them to different ports. The environment variables used for database, user, and password initialization match the documented container image behavior and apply only when the data directory is initialized. The firewall commands correctly open the mapped host ports instead of relying on a single `mysql` service entry.
