# Validation Summary: How to Install PHP 8.2 on RHEL Using the Remi Repository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PHP 8.2
- Remi RPM repository
- EPEL
- DNF module streams
- PHP-FPM
- SELinux file contexts

## Sources Consulted
- Remi RPM repository: Install PHP 8.2 on Fedora, RHEL, CentOS, Alma, Rocky or other clone: https://blog.remirepo.net/post/2023/04/19/Install-PHP-8.2-on-Fedora-RHEL-CentOS-Alma-Rocky-or-other-clone
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- PHP supported versions: https://www.php.net/supported-versions.php

## Issues Found
- The repository setup omitted the CodeReady Builder repository requirement for RHEL 9. Remi's RHEL 9 instructions include enabling `codeready-builder-for-rhel-9-x86_64-rpms`, so the post now includes `sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms`.
- The description and introduction described PHP 8.2 as providing the latest PHP features beyond AppStream. As of 2026-05-15, PHP 8.2 is in security support only, and RHEL 9 also provides a `php:8.2` module stream. The wording now says the guide installs the needed PHP version from Remi's module stream and package updates.
- The update command used an unquoted shell glob, `php*`, which could be expanded by the shell if matching local files exist. It is now quoted as `'php*'` so DNF receives the package glob.

## Review Notes
The installation flow is specific to RHEL 9 because it uses the EPEL 9 and Remi EL9 release packages. The PHP-FPM pool settings shown are valid examples, but users should keep the pool user, group, and socket ownership aligned with the actual web server configuration.
