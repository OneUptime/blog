# Validation Summary: How to Use Aptitude as an Alternative to APT on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT
- aptitude
- Debian package management
- aptitude search patterns
- aptitude configuration

## Sources Consulted
- Debian aptitude user's manual, command-line reference: https://www.debian.org/doc/manuals/aptitude/rn01re01.en.html
- Debian aptitude user's manual, search patterns: https://www.debian.org/doc/manuals/aptitude/ch02s04.en.html
- Debian aptitude user's manual, search term reference: https://www.debian.org/doc/manuals/aptitude/ch02s04s05.en.html
- Debian aptitude user's manual, configuration file reference: https://www.debian.org/doc/manuals/aptitude/ch02s05s05.en.html
- Ubuntu aptitude man page: https://manpages.ubuntu.com/manpages/xenial/man8/aptitude-curses.8.html
- Local `apt --help` output for APT command availability.

## Issues Found
- The `~s` aptitude search pattern was described as matching the short description. It actually matches package sections, so the example comment was changed to say it finds packages in sections matching "database".
- The basic upgrade example used `aptitude upgrade`. The official aptitude manual documents `safe-upgrade`, so the command was changed to `sudo aptitude safe-upgrade`.
- The `-P` option was described as asking before each action. It actually always displays a prompt before downloading, installing, or removing packages, so the comment was corrected.
- The "Managing Package Priorities" heading described auto/manual package state examples rather than package priorities, so it was corrected to "Managing Automatic Package States with aptitude".
- The garbage cleanup example implied `autoclean` removes garbage packages. `autoclean` removes cached packages that can no longer be downloaded, so the comment was clarified before the `remove '~g'` command.
- The scripting section claimed aptitude works well in scripts because of rich exit codes. The documented behavior supports normal shell success/failure handling, so the wording was narrowed.
- The configuration example used `Aptitude::Verbose`, but the documented command-line verbosity option is `Aptitude::CmdLine::Verbose`, so the key was corrected.
- The `Aptitude::Keep-Unused-Pattern` comment incorrectly described conflict behavior. It was corrected to describe its actual effect on unused package removal.

## Review Notes
The post's main command examples, search-pattern examples, `why` / `why-not` usage, `--simulate`, `-P`, `--schedule-only`, `-f`, log location, and configuration file locations were consistent with the aptitude documentation after the corrections above.
