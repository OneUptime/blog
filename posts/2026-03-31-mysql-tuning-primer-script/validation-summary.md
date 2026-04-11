# Validation Summary: How to Use Tuning-Primer Script for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- tuning-primer.sh (bash script)
- MySQLTuner (comparison)
- systemctl (service management)

## Sources Consulted
- BMDan/tuning-primer.sh GitHub repository: https://github.com/BMDan/tuning-primer.sh (README and source code)
- Launchpad project page: https://launchpad.net/mysql-tuning-primer/trunk/1.6-r1/+download/tuning-primer.sh (verified URL still serves the script)
- MySQL 8.0 Reference Manual for SHOW STATUS / SHOW VARIABLES privilege requirements

## Issues Found

1. **Download section mislabeled**: The introductory text said "The actively maintained fork lives on GitHub:" but the first code block downloaded from Launchpad (the original v1.6-r1 from 2011, not the BMDan fork). Fixed by changing the intro text to "Download the original version from Launchpad:" and labeling the GitHub clone as "the actively maintained fork."

2. **Fabricated environment variables for remote connections**: The post showed `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` environment variables for remote server connections. These variables do not exist in the tuning-primer.sh script (neither the original nor the BMDan fork). The script connects via local MySQL socket and uses an interactive prompt for credentials. Removed the entire remote connection example.

3. **Incorrect uptime warning threshold and message format**: The post stated the script warns if MySQL has been running for "less than 24 hours" and showed a fabricated warning message ("Warning: MySQL has only been running for 4:22:10 seconds."). The actual threshold is 48 hours (172800 seconds), and the actual message reads "Warning: Server has not been running for at least 48hrs. / It may not be safe to use these recommendations." Fixed both the threshold and the warning message text.

4. **SUPER privilege claim**: The post stated the script requires "the MySQL SUPER privilege." The script source contains no privilege checks and does not document any privilege requirements. SHOW STATUS and SHOW VARIABLES require no special privileges in MySQL 5.x; in MySQL 8.0+, the PROCESS privilege (not SUPER) may be needed for some status variables. Fixed to mention PROCESS privilege for MySQL 8.0+.

5. **Summary uptime reference**: The summary said "Run it after 24-48 hours" which was inconsistent with the script's actual 48-hour threshold. Fixed to "at least 48 hours."

## Review Notes
- The sample output section is illustrative and doesn't exactly match the script's actual output format (which uses colored terminal output with different section headers). This is acceptable for a blog post but readers should expect visual differences when running the script.
- The comparison table noting "Partial" MySQL 8 support for tuning-primer is a fair characterization. The BMDan fork has some MySQL 8.0 awareness but does not handle all 8.0 changes (e.g., query cache removal).
- The script connects via local socket only and does not natively support remote TCP connections. Users needing remote analysis should consider MySQLTuner or SSH tunneling.
