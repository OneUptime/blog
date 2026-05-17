# Validation Summary: How to Use vnStat for Network Traffic Accounting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- vnStat (network traffic monitor, version 2.x)
- vnstati (companion image-generation tool)
- Ubuntu (apt package management, systemd)
- Bash scripting
- jq (JSON parsing)
- cron
- Nginx + PHP-FPM (for the optional web frontend)
- SQLite (vnStat 2.x database backend)

## Sources Consulted
- Official vnStat man page: https://humdi.net/vnstat/man/vnstat.html
- Official vnstati man page: https://humdi.net/vnstat/man/vnstati.html
- vnStat project homepage: https://humdi.net/vnstat/
- vnStat source code (dbsql.c) for JSON ordering: https://raw.githubusercontent.com/vergoh/vnstat/master/src/dbsql.c
- thrau/vnstat2-php-frontend README: https://github.com/thrau/vnstat2-php-frontend
- alexandermarston/vnstat-dashboard (vnStat 2.x compatible alternative): https://github.com/alexandermarston/vnstat-dashboard

## Issues Found

1. **`vnstat --png` does not exist in vnStat 2.x.** PNG image generation was moved to a separate binary, `vnstati`, packaged separately as `vnstati`. The blog originally used `vnstat --png d -o ...` and `vnstat --png m -o ...`, which would fail on any current Ubuntu release. Replaced with `sudo apt install vnstati -y` followed by `vnstati -d -i enp0s3 -o ...` and `vnstati -m -i enp0s3 -o ...`, matching the official vnstati(1) man page.

2. **`vnstat --top10` is not a valid option in vnStat 2.x.** The current syntax is `-t, --top [limit]` per the official man page. The default limit is already 10, so `vnstat --top` alone produces the same result. Changed `vnstat --top10` to `vnstat --top 10` and added a note that `vnstat --top` is equivalent.

3. **Broken external repository URL.** The post referenced `https://github.com/sergeifilippov/vnstat-dashboard` for the optional PHP web frontend, but that repository does not exist (HTTP 404). Replaced it with `thrau/vnstat2-php-frontend`, an actively maintained fork explicitly built for vnStat 2.x that installs via the same wget+unzip flow used in the post (no Composer needed, only PHP + GD). Updated the directory rename step accordingly.

## Review Notes

- The jq query `.interfaces[0].traffic.month[0].rx + .interfaces[0].traffic.month[0].tx` is correct for the current month. Verified via vnStat's `db_getdata_range` in `src/dbsql.c`, which uses `ORDER BY date DESC` — so index `[0]` is the most recent month in the JSON output.
- Core flag set (`-d`, `-m`, `-h`, `-y`, `-l`, `-s`, `--json`, `--xml`, `--iflist`, `--dbiflist`, `--add`, `--remove`, `--live`) all match the official vnStat 2.x man page.
- Configuration file keys (`UpdateInterval`, `SaveInterval`, `MonthRotate`, `MaxBandwidth`, `DatabaseDir`, `LogFile`) all match the shipped `vnstat.conf` defaults.
- `/var/lib/vnstat/vnstat.db` is the correct SQLite database path on Debian/Ubuntu packages of vnStat 2.x.
- The systemd service name `vnstat` is correct on Ubuntu (the daemon binary is `vnstatd` but the service unit is `vnstat.service`).
- The PHP frontend section is functional but somewhat dated as a recommendation; readers wanting a modern dashboard may prefer the Docker-based `alexandermarston/vnstat-dashboard`, but that requires `composer install` and would not slot into the current wget+unzip flow without restructuring — kept the simpler option to preserve the post's structure.
