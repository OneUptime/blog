# Validation Summary: How to Install MySQL Using the YUM Repository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / 8.4 LTS / 9.x
- YUM / DNF package management
- RHEL, CentOS Stream, Rocky Linux, AlmaLinux, Fedora
- systemd service management
- mysql_secure_installation

## Sources Consulted
- MySQL Yum Repository Downloads page: https://dev.mysql.com/downloads/repo/yum/
- MySQL Yum Repo Quick Guide: https://dev.mysql.com/doc/mysql-yum-repo-quick-guide/en/
- MySQL 8.4 Reference Manual - mysql_secure_installation: https://dev.mysql.com/doc/refman/8.4/en/mysql-secure-installation.html

## Issues Found

1. **GPG Key URL outdated**: The post referenced `RPM-GPG-KEY-mysql-2023` but the current key is `RPM-GPG-KEY-mysql-2025`. Fixed the URL on line 55.

2. **EL9 repository RPM release number outdated**: The post used `mysql84-community-release-el9-1.noarch.rpm` but the current release is `-el9-3`. Updated the URL on line 35.

3. **EL8 repository RPM release number outdated**: The post used `mysql84-community-release-el8-1.noarch.rpm` but the current release is `-el8-2`. Updated the URL on line 41.

4. **Fedora version outdated**: The post referenced Fedora 40, which is no longer listed on the MySQL Yum downloads page. Updated to Fedora 42 with the corresponding RPM URL on line 47.

5. **Prerequisites Fedora version outdated**: The prerequisites listed "Fedora 38+" but the MySQL Yum repo currently supports Fedora 42+. Updated on line 26.

## Review Notes
- The `FLUSH PRIVILEGES` in Step 8 is unnecessary after `GRANT` statements (MySQL automatically reloads grant tables for account management DDL), but it is not harmful and is an extremely common convention in tutorials. Left as-is.
- When switching MySQL versions (Step 3 and "Switching to a Different Major Version"), the official MySQL docs also recommend toggling the corresponding tools repos (e.g., `mysql-tools-8.4-lts-community` / `mysql-tools-community`). The post omits this, which could lead to mismatched tool versions. Not a blocking issue but worth noting for a future update.
- RPM release numbers in download URLs are inherently time-sensitive; Oracle increments them with each repo RPM update. These URLs will need periodic maintenance.
- All SQL syntax, systemd commands, dnf commands, repo IDs, file paths, and package names are correct and match official documentation.
