# Validation Summary: How to Configure systemd Service Dependencies on Ubuntu

## Status
validated

## Post Type
Tutorial / technical administration guide

## Technologies Covered
- Ubuntu
- systemd unit files
- systemctl
- systemd-analyze
- Linux service dependency management
- PostgreSQL readiness checks with pg_isready

## Sources Consulted
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.special official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- systemctl official manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Local Ubuntu systemd 255 manual pages and CLI help for systemd.unit, systemd.service, systemd.special, systemctl, and systemd-analyze

## Issues Found
- Clarified `Requires=` behavior. The original text implied that any required-unit stop or failure always stops/fails the dependent unit. systemd only prevents startup on dependency activation failure when the dependent unit is ordered `After=` the failed unit, and self-deactivation of a required unit is not always propagated. The text now distinguishes explicit stop/restart propagation from unexpected deactivation.
- Corrected `BindsTo=` wording. The original example said reloads stop the dependent unit, but reloads do not deactivate a unit. The text now refers to stops and unexpected inactive transitions.
- Corrected the webapp example's network dependency. The example ordered after `network-online.target` but did not pull it in, so starting the service manually might not wait for the online target. Added `Wants=network-online.target`.
- Corrected an overstatement in the nginx drop-in example. `Requires=webapp.service` with `After=webapp.service` prevents nginx from starting if the backend fails in the same transaction, but it does not necessarily stop nginx if the backend later exits on its own. Added a note about using `BindsTo=` for that behavior.
- Corrected the network target explanation. `network.target` does not guarantee IP address assignment, and `network-online.target` does not universally guarantee routability or DNS. The text now follows systemd's implementation-dependent wording.
- Fixed the `ExecStartPre` readiness loop. The original loop could exit successfully after the final failed `pg_isready` attempt because the last command was `sleep`. It now exits with status 1 if all attempts fail.
- Replaced invalid `ConditionPathNotExists=` with the supported negated `ConditionPathExists=!/etc/myapp/disabled` form.

## Review Notes
The remaining examples are illustrative and use placeholder service paths such as `/usr/bin/webapp` and `https://docs.example.com`, which are syntactically acceptable but would need real application-specific paths in production. `Type=notify` is correct only for services that actually send systemd readiness notifications.
