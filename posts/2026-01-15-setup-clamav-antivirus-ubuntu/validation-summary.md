# Validation Summary: How to Set Up ClamAV Antivirus on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- ClamAV
- clamscan
- clamd and clamdscan
- freshclam
- clamonacc on-access scanning
- clamav-milter
- Postfix
- Amavis
- cron and systemd timers
- Prometheus node-exporter textfile metrics

## Sources Consulted
- ClamAV official scanning documentation: https://docs.clamav.net/manual/Usage/Scanning.html
- ClamAV official on-access scanning documentation: https://docs.clamav.net/manual/OnAccess.html
- ClamAV official configuration documentation: https://docs.clamav.net/manual/Usage/Configuration.html
- ClamAV upstream freshclam.conf man page source: https://github.com/Cisco-Talos/clamav/blob/main/docs/man/freshclam.conf.5.in
- ClamAV upstream clamd.conf man page source: https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamd.conf.5.in
- Debian clamd.conf(5) man page for ClamAV 1.4.4: https://manpages.debian.org/unstable/clamav-daemon/clamd.conf.5.en.html
- Debian clamscan(1) man page: https://manpages.debian.org/testing/clamav/clamscan.1.en.html
- clamav-milter.conf(5) man page: https://linux.die.net/man/5/clamav-milter.conf
- Ubuntu community documentation for Postfix and Amavis integration: https://help.ubuntu.com/community/PostfixAmavisNew

## Issues Found
- The freshclam example included the obsolete `SafeBrowsing yes` configuration option. Replaced it with `Bytecode yes`, which is a current freshclam option for downloading bytecode signatures.
- The clamdscan example used `clamdscan -r`, but current clamdscan does not provide a `-r` recursive flag. Changed the example to use normal file and directory scans, and kept `--multiscan` for multi-worker directory scanning.
- The on-access configuration enabled `OnAccessExtraScanning` while also setting `OnAccessDisableDDD yes`. ClamAV documentation states DDD is used for recursive include-path tracking and extra scanning depends on it. Changed both on-access examples to keep DDD enabled.
- The clamd.conf example used `ArchiveBlockEncrypted`, which is not a current ClamAV directive. Replaced it with `AlertEncryptedArchive no`.
- The clamd.conf example used `AlgorithmicDetection yes`, which is not the current directive name. Replaced it with `HeuristicAlerts yes`.
- The cron example added a manual `freshclam` job after enabling the `clamav-freshclam` service, which can conflict with the running updater. Changed it to an optional commented cron line for users who disable the service.
- The clamav-milter example used `LogClean no`, but clamav-milter expects values such as `Off`, `Basic`, or `Full`. Changed it to `LogClean Off`.
- The clamav-milter comments described `VirusAction` and `MaxFileSize` incorrectly. Updated those comments to match the actual directives.
- The `/etc/cron.d/clamav-monitor` example omitted the required user field. Added `root` to the generated cron.d entry.

## Review Notes
- Extracted bash code blocks were syntax-checked with `bash -n`; no shell syntax errors were found.
- ClamAV was not installed in the local environment, so command and configuration verification used official ClamAV documentation and authoritative man pages rather than local `--help` output.
