# Validation Summary: How to Create systemd Path Units for File System Triggered Automation on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- systemd path units
- systemd service units
- systemctl
- journalctl

## Sources Consulted
- systemd.path(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/systemd.path.html
- systemd.unit(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.service(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Red Hat Enterprise Linux documentation, systemd unit files and unit locations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- Red Hat blog, path unit example: https://www.redhat.com/en/blog/introduction-path-units
- Local system man pages for systemd.path(5), systemd.unit(5), and systemctl help output

## Issues Found
- The service example did not state that `/usr/local/bin/process-uploads.sh` must exist and be executable. I added that requirement so the `ExecStart=` example is operational.
- The `PathExistsGlob=` example did not mention that matched files should be moved or removed after processing. systemd checks path conditions again after the triggered service exits, so leaving matching files in place can retrigger the service immediately. I added that note to the service setup.
- The trigger type descriptions were too broad for `PathChanged`, `PathModified`, and `DirectoryNotEmpty`. I corrected them to match systemd.path(5): `PathChanged=` is tied to close-after-write behavior for files, `PathModified=` also reacts to writes, changes, and attribute changes, and `DirectoryNotEmpty=` activates when the directory contains at least one file.
- The test command used `touch /var/uploads/test.csv`, but `/var/uploads` is created by the path unit as root-owned `0755`, so an unprivileged user usually cannot create the file. I changed it to `sudo touch /var/uploads/test.csv`.

## Review Notes
The path unit and service unit syntax are valid. `MakeDirectory=yes`, `DirectoryMode=0755`, `[Install] WantedBy=multi-user.target`, `systemctl daemon-reload`, and `systemctl enable --now` are appropriate for administrator-managed units under `/etc/systemd/system/`. The article does not target a specific RHEL major version; the covered path directives are available across supported RHEL systemd versions.
