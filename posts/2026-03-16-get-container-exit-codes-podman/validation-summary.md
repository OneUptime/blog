# Validation Summary: How to Get Container Exit Codes in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Bash shell scripting
- Container exit codes and signals

## Sources Consulted
- Podman command exit codes: https://docs.podman.io/en/latest/markdown/podman.1.html#exit-codes
- Podman wait command: https://docs.podman.io/en/v5.5.1/markdown/podman-wait.1.html
- Podman inspect command: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect fields: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman ps format fields and filters: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman start command: https://docs.podman.io/en/latest/markdown/podman-start.1.html

## Issues Found
- The common exit-code table omitted exit code 125, which Podman reserves for errors in Podman itself. Added a 125 row.
- The post treated all codes from 1 through 125 as application errors in the summary. Changed this to 1-124 as typical application errors, 125 as a Podman error, and 126-127 as command invocation errors.
- The post stated that codes above 128 always indicate signal termination. Softened this to "often" because 128+N is a common shell convention, but applications can also choose those numeric exit statuses.
- The OOM example used `dd if=/dev/zero of=/dev/null bs=20m`, which does not reliably exceed the container memory limit because it streams data to `/dev/null`. Replaced it with a command that stores generated data in a shell variable to create memory pressure.
- The signal interpretation script did not handle Podman's exit code 125. Added a case for "Podman error."
- The 255 table entry described it as "Exit status out of range," which is not a Podman-specific meaning and is potentially misleading. Changed it to an application-specific error or shell status such as `exit -1`.

## Review Notes
Podman is not installed in the local review environment, so commands were verified against official Podman documentation rather than by local execution. The `podman ps`, `podman inspect`, `podman wait`, and `podman start` examples use current documented flags and Go template fields.
