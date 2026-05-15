# Validation Summary: How to Set Up Bareos as a Fork of Bacula for Backup Management on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Bareos
- Bacula
- PostgreSQL
- systemd
- firewalld

## Sources Consulted
- Bareos documentation, Installing the Bareos Server: https://docs.bareos.org/master/IntroductionAndTutorial/InstallingBareos.html
- Bareos current repository index: https://download.bareos.org/current/
- Bareos documentation, What is Bareos?: https://download.bareos.org/current/BareosMainReference/IntroductionAndTutorial/WhatIsBareos.html
- Bareos documentation, Getting Started with Bareos: https://docs.bareos.org/IntroductionAndTutorial/GettingStartedWithBareos.html
- Bareos documentation, Network setup: https://docs.bareos.org/TasksAndConcepts/NetworkSetup.html
- Bareos documentation, Customizing the Configuration: https://docs.bareos.org/master/Configuration/CustomizingTheConfiguration.html
- Red Hat documentation, Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- firewalld documentation, firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The installation command used `<package-name>`, which would not install Bareos. Replaced it with the Bareos repository setup script for EL 9 and `dnf install -y bareos`, matching the Bareos installation documentation and repository index.
- The prerequisite commands installed EPEL and Development Tools, which are not the documented requirements for a basic Bareos server installation. Replaced them with PostgreSQL server setup commands because the Bareos Director requires a PostgreSQL catalog.
- The configuration path `/etc/<service>/config.conf` was a placeholder and not a Bareos configuration path. Replaced it with the Bareos Director configuration path under `/etc/bareos/bareos-dir.d/` and added the documented database initialization commands.
- The systemd service name `<service>` was a placeholder. Replaced it with the RPM-based Bareos service units `bareos-dir.service`, `bareos-sd.service`, and `bareos-fd.service`.
- The validation command `<service> --test` was not a valid Bareos configuration test. Replaced it with the documented `-t` checks for `bareos-dir`, `bareos-sd`, `bareos-fd`, and `bconsole`.
- The firewall command used `--add-service=<service>`, but Bareos documentation specifies TCP ports 9101-9103 for daemon access. Replaced it with `--add-port=9101-9103/tcp`.
- The monitoring and troubleshooting commands used placeholder service and process names. Replaced them with Bareos Director service and process names.

## Review Notes
The repository URL uses the Bareos community `current` repository with `EL_9` as the concrete example for RHEL 9 and compatible Enterprise Linux systems. For RHEL 8, RHEL 10, or another supported release, the matching directory should be selected from the Bareos download repository.
