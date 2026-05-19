# Validation Summary: How to Create Systemd Path Units for File Change Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd path units
- systemd service units
- systemctl
- journalctl
- Bash scripting

## Sources Consulted
- `systemd.path(5)` local system manual; official online reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.path.html
- `systemd.service(5)` local system manual; official online reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- `systemd.exec(5)` local system manual; official online reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- `systemctl(1)` local system manual; official online reference: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- `journalctl(1)` local system manual; official online reference: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The introduction claimed path units "restart on failure." Path units do not use service-style `Restart=` behavior; the triggered service can use `Restart=`. Removed that claim from the introduction.
- The path condition examples implied a nonexistent "path does not exist" condition using `PathExistsGlob=` with an empty value. In systemd, assigning an empty string resets the path list. Replaced this with a note that systemd path units do not provide a negative existence condition and that a service-side check or positive marker file should be used.
- The `DirectoryNotEmpty=` example described it as a generic directory modification trigger. Official documentation defines it as activating when the directory contains at least one file. Updated the comment accordingly.
- The lock-file example initially presented `PathExists=` as if it could trigger when a file disappeared. Updated the setup and inline comment to make clear that it activates when the file exists, then kept the corrected marker-file approach.
- The restart behavior section suggested `RemainAfterExit=no` allowed concurrent activations or new instances. That is not how non-template services work. Replaced it with accurate guidance that an unset `RemainAfterExit` lets a oneshot service return to inactive so it can be triggered again.
- The comparison table attributed restart-on-failure behavior directly to path units. Clarified that `Restart=` belongs to the triggered service.

## Review Notes
The reviewed commands and configuration directives are consistent with current systemd documentation. The examples are intentionally illustrative and assume the referenced users, scripts, directories, and application commands exist on the target Ubuntu system.
