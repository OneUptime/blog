# Validation Summary: How to Set Up Amanda Backup Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 22.04/24.04
- Amanda 3.5.x
- Amanda server and client packages
- Amanda configuration files (`amanda.conf`, `disklist`, `amanda-client.conf`, `.amandahosts`)
- Amanda virtual tapes and `chg-disk`
- Amanda CLI tools (`amdump`, `amcheck`, `amreport`, `amstatus`, `amadmin`, `amrecover`, `amfetchdump`, `amrestore`)
- UFW firewall rules

## Sources Consulted
- Ubuntu 24.04 package metadata for `amanda-server`, `amanda-client`, and `amanda-common` (`apt-cache policy`, `apt-cache depends`, downloaded package contents)
- Ubuntu packaged Amanda documentation: `/usr/share/doc/amanda-server/README.Debian`, `/usr/share/doc/amanda-client/README.Debian`, and packaged examples
- Ubuntu/Debian Amanda man pages: `amanda.conf(5)`, `amanda-client.conf(5)`, `disklist(5)`, `amanda-changers(7)`, `amdump(8)`, `amcheck(8)`, `amreport(8)`, `amstatus(8)`, `amadmin(8)`, `amlabel(8)`, `amrecover(8)`, `amfetchdump(8)`, `amrestore(8)`, `amtape(8)`, `amtoc(8)`, `ampgsql(8)`, `script-email(8)`
- Ubuntu manpages: https://manpages.ubuntu.com/manpages/focal/man5/amanda.conf.5.html
- Debian manpages: https://manpages.debian.org/testing/amanda-common/amanda-client.conf.5.en.html
- Debian manpages: https://manpages.debian.org/testing/amanda-common/amdump.8.en.html
- Amanda project site: https://www.amanda.org/

## Issues Found
- Ubuntu package user was wrong: the post used `amandabackup`, but Ubuntu/Debian Amanda packages use the `backup` user. Updated `id`, `sudo -u`, ownership, `.amandahosts`, cron, restore script, and troubleshooting examples accordingly.
- Virtual tape configuration mixed old and invalid syntax. Replaced `file:/.../slot{...}` plus `tpchanger` with current `tapedev "chg-disk:/var/lib/amanda/vtapes/DailyBackup"` syntax and added `tapecycle`.
- Removed the separate `changer.conf` step because `chg-disk` is configured through `amanda.conf`, not a separate vtape-local config file in this setup.
- Corrected the database application example: `ampgsql` is the PostgreSQL plugin, not a MySQL plugin. Renamed the examples and added a matching `define application app-pgsql`.
- Corrected the disklist include note. `includefile` belongs in `disklist`, not `amanda.conf`.
- Removed invalid or misleading command examples, including `amdump DailyBackup --debug 9`, `amreport --date`, `amrestore --list`, and positional `amrecover DailyBackup`.
- Corrected firewall guidance for the default `bsdtcp` service and restore ports instead of broadly allowing `10080:10083` over both TCP and UDP.
- Corrected restore authorization examples so server-side `.amandahosts` allows client `root` for `sudo amrecover`.
- Corrected client-side compression guidance: compression belongs in the server-side dumptype, not as `compress fast` in `amanda-client.conf`.

## Review Notes
The post is now technically aligned with Ubuntu 24.04's Amanda 3.5.1 packaging and official Amanda man pages. Production deployments may still prefer SSH authentication over `bsdtcp`, but the `bsdtcp` examples are valid when the Amanda inet service is available and firewalls permit it.
