# Validation Summary: How to Reconfigure Installed Packages with dpkg-reconfigure on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu package management
- dpkg-reconfigure
- debconf
- debconf-set-selections, debconf-get-selections, debconf-show, debconf-communicate
- tzdata, locales, keyboard-configuration, console-setup
- openssh-server, postfix, unattended-upgrades, wireshark-common

## Sources Consulted
- Debian dpkg-reconfigure(8) manual page: https://manpages.debian.org/dpkg-reconfigure
- Debian debconf(7) manual page: https://manpages.debian.org/testing/debconf-doc/debconf.7.en.html
- Debian debconf-set-selections(1) manual page: https://manpages.debian.org/trixie/debconf/debconf-set-selections.1.en.html
- Local Ubuntu man pages for dpkg-reconfigure(8), debconf(1), debconf-set-selections(1), debconf-show(1), and debconf-communicate(1)
- Installed Ubuntu package maintainer scripts and debconf templates under /var/lib/dpkg/info for tzdata, locales, keyboard-configuration, console-setup, openssh-server, and unattended-upgrades
- Ubuntu package metadata and extracted debconf templates for postfix 3.8.6-1ubuntu0.1 and wireshark-common 4.2.2-1.1build3
- Local update-locale help output for current Ubuntu locale file behavior

## Issues Found
- The Postfix preseeding example used `string 'Internet Site'` for `postfix/main_mailer_type`. The actual debconf template type is `select`, and quotes would be included in the value when passed to debconf-set-selections. Changed it to `select Internet Site`.
- The locale noninteractive examples wrote only `LANG=en_US.UTF-8` before running `dpkg-reconfigure locales`. The locales maintainer script reads debconf values during reconfiguration, so this could be overwritten by existing debconf answers. Changed the examples to preseed `locales/locales_to_be_generated` and `locales/default_environment_locale` before running dpkg-reconfigure.
- The debconf-show example said starred items have non-default values. The debconf-show manual says `*` marks questions that have already been asked. Corrected the explanation.
- The debugging section said `dpkg-reconfigure --force` re-asks all questions regardless of cached answers. The dpkg-reconfigure manual says `--force` reconfigures packages in an inconsistent or broken state. Corrected the comment.
- The debconf purge example used a pipeline and here-string with xargs in a way that would feed the wrong stdin to debconf-communicate. Replaced it with `echo "PURGE" | sudo debconf-communicate package-name`.
- The `--priority=low` comments implied low priority is needed to overcome a high-priority default. The dpkg-reconfigure manual notes it normally shows low-priority questions, so the wording was changed to describe the flag as explicit.

## Review Notes
The package examples are valid for current Ubuntu packaging, but the exact prompts shown by dpkg-reconfigure are package-maintainer controlled and can change between Ubuntu releases.
