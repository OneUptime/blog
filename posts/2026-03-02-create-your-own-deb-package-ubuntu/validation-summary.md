# Validation Summary: How to Create Your Own .deb Package on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu package management
- Debian binary packages
- dpkg and dpkg-deb
- Debian control files
- Debian maintainer scripts
- systemd service units
- dpkg-buildpackage, debhelper, and devscripts
- lintian

## Sources Consulted
- Debian Policy Manual: https://www.debian.org/doc/debian-policy/
- Debian Policy Manual, Control files and their fields: https://www.debian.org/doc/debian-policy/ch-controlfields.html
- Debian Policy Manual, Package maintainer scripts and installation procedure: https://www.debian.org/doc/debian-policy/ch-maintainerscripts.html
- Debian Policy Manual, Files and configuration files: https://www.debian.org/doc/debian-policy/ch-files.html
- Debian Policy Manual, Operating system and service management guidance: https://www.debian.org/doc/debian-policy/ch-opersys.html
- Local `dpkg-deb(1)` manual page from dpkg 1.22.6
- Local `deb-control(5)` manual page from dpkg 1.22.6
- Local `deb-conffiles(5)` manual page from dpkg 1.22.6
- Local `deb-md5sums(5)` manual page from dpkg 1.22.6
- Local `deb-version(7)` manual page from dpkg 1.22.6
- Local `dpkg-buildpackage(1)` manual page from dpkg 1.22.6
- Local `systemctl(1)` and `systemd.unit(5)` manual pages

## Issues Found
- The `DEBIAN/control` example had a blank line between `Description: MyCompany System Monitor` and the long description. `dpkg-deb` rejects that format with an `empty field name` parsing error because continuation lines for the long description must immediately follow the short description and begin with a space. Removed the blank line.
- The package-name explanation omitted periods and did not mention that names must start with an alphanumeric character. Updated the description to match Debian package-name syntax.
- The `postinst` comment said the script enabled and started the service, but the script only ran `systemctl enable` and told the user how to start it manually. Updated the comment to say it enables the service.
- The `dpkg-buildpackage` snippet wrote `debian/rules` without first ensuring the `debian/` directory exists. Added `mkdir -p debian` before creating `debian/rules`.

## Review Notes
The corrected `dpkg-deb` package example was built successfully in a temporary workspace, and `dpkg-deb --info` showed valid control metadata. For public Debian or Ubuntu packages, the direct `systemctl` maintainer-script calls are still less robust than debhelper-generated service handling via tools such as `dh_installsystemd`, but the post already scopes the manual approach to internal packages and recommends the full `dpkg-buildpackage` workflow for maintained distribution.
