# Validation Summary: How to Set Up ClamAV Mail Scanning on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClamAV (open-source antivirus engine)
- clamav-daemon (clamd)
- clamav-milter (Postfix milter integration)
- freshclam (signature update daemon)
- Postfix (MTA)
- Ubuntu / systemd
- swaks (SMTP testing tool)
- EICAR test virus signature

## Sources Consulted
- ClamAV official documentation: https://docs.clamav.net/
- clamd.conf man page (Ubuntu): https://manpages.ubuntu.com/manpages/jammy/man5/clamd.conf.5.html
- clamav-milter.conf man page (Ubuntu): https://manpages.ubuntu.com/manpages/jammy/man5/clamav-milter.conf.5.html
- ClamAV Hash Signatures documentation: https://docs.clamav.net/manual/Signatures/HashSignatures.html
- Postfix milter documentation: https://www.postfix.org/MILTER_README.html
- EICAR standard test file: https://www.eicar.org/download-anti-malware-testfile/

## Issues Found
1. **Invalid `LogViruses yes` directive in clamd.conf snippet.** clamd.conf does not recognize a `LogViruses` directive. Valid Log* directives are LogFile, LogFileUnlock, LogFileMaxSize, LogTime, LogClean, LogSyslog, LogFacility, LogVerbose, and LogRotate. Infected detections are written to the configured LogFile by default. Replaced with `LogClean no` (a real directive) and updated the comment accordingly.

2. **Incorrect syntax for `ReportHostname yes` in clamav-milter.conf.** `ReportHostname` accepts a STRING (a hostname), not a boolean. Setting it to `yes` would literally use "yes" as the reported hostname. Replaced with a sample value `ReportHostname mail.example.com` and corrected the comment to describe what the directive actually does (sets the hostname reported in the X-Virus-Scanned header).

3. **SHA256 hash example used the wrong file extension.** The post computed a SHA256 hash but wrote the signature to a `.hdb` file. In ClamAV, `.hdb` is reserved for MD5 hash databases; SHA1/SHA256 hashes belong in `.hsb` files. Changed the example to use `local.hsb` and updated the comment to clarify the difference between `.hsb` and `.hdb`.

## Review Notes
- The EICAR standard test string is reproduced correctly.
- Package names (`clamav`, `clamav-daemon`, `clamav-milter`) and systemd unit names (`clamav-daemon`, `clamav-freshclam`, `clamav-milter`) match what Ubuntu currently ships.
- Postfix milter URL syntax (`local:/path/to/socket`) is valid; `unix:` is an equivalent alternative.
- The `OnInfected` values (Accept, Reject, Defer, Blackhole, Quarantine) and `OnFail` values (Accept, Reject, Defer) used in the post are correct.
- The Quarantine section provides a minimal `transport_maps` example. In practice, clamav-milter's Quarantine action depends on the `QuarantineRecipient` directive (default `virus-quarantine`) and on the MTA's handling of the milter quarantine response; readers integrating this into production should consult the clamav-milter.conf docs for `VirusAction` and `QuarantineRecipient` for a complete pipeline.
- The `sigtool --info` examples assume `.cvd` files exist; on a freshly updated install ClamAV uses `.cld` (incremental) files instead, so users may need to substitute `daily.cld` / `main.cld`. The troubleshooting section already covers this with the `*.cvd *.cld` glob.
- `LogFacility LOG_MAIL` is valid syntax; the more common default in distro packages is `LOG_LOCAL6`, but `LOG_MAIL` is a reasonable choice for mail-related scanning.
