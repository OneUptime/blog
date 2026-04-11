# Validation Summary: How to Install MySQL on Amazon Linux 2023

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / 8.4 LTS
- Amazon Linux 2023 (AL2023)
- DNF package manager
- systemd
- mysql_secure_installation
- AWS CLI (EC2 security groups)

## Sources Consulted
- MySQL official documentation: Installing MySQL on Linux Using the MySQL Yum Repository (https://dev.mysql.com/doc/refman/8.4/en/linux-installation-yum-repo.html)
- MySQL 8.4 community release RPM naming conventions (https://dev.mysql.com/downloads/repo/yum/)
- Amazon Linux 2023 documentation: Package management with DNF (https://docs.aws.amazon.com/linux/al2023/ug/package-management.html)
- AWS CLI v2 reference: authorize-security-group-ingress (https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html)
- MySQL 8.0/8.4 reference: mysql_secure_installation (https://dev.mysql.com/doc/refman/8.4/en/mysql-secure-installation.html)
- MySQL 8.0/8.4 reference: CREATE USER, GRANT syntax (https://dev.mysql.com/doc/refman/8.4/en/create-user.html)

## Issues Found
1. **Description claimed "MySQL 8.0" but default install is 8.4**: The description stated "Install MySQL 8.0 on Amazon Linux 2023" but the repo RPM (`mysql84-community-release-el9-1.noarch.rpm`) defaults to MySQL 8.4 LTS. The 8.0 pinning steps are presented as an optional alternative, not the main flow. Fixed the description to say "Install MySQL on Amazon Linux 2023" without specifying a single version, since the tutorial covers both 8.4 (default) and 8.0 (optional pin).

## Review Notes
- `FLUSH PRIVILEGES` in Step 6 is technically redundant when using `CREATE USER` and `GRANT` in MySQL 8.0+, since those statements automatically update the in-memory privilege tables. It is not harmful and is a common convention, so it was left as-is.
- The collation `utf8mb4_unicode_ci` is valid but not the default for MySQL 8.0+ (which uses `utf8mb4_0900_ai_ci`). This is a valid choice and not an error.
- The exact RPM filename (`mysql84-community-release-el9-1.noarch.rpm`) may change as Oracle releases updates. The URL pattern `https://dev.mysql.com/get/mysql84-community-release-el9-*.noarch.rpm` is correct, but the specific revision number (`-1`) could become outdated.
