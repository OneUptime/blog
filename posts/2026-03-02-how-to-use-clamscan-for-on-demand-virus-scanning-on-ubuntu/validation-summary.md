# Validation Summary: How to Use ClamScan for On-Demand Virus Scanning on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClamAV (clamscan, clamdscan, freshclam, clamav-daemon)
- Ubuntu (apt-get, systemctl)
- Bash scripting (wrapper / cron scan script)
- PHP (upload handler integration)
- EICAR test file

## Sources Consulted
- ClamAV official documentation — Scanning: https://docs.clamav.net/manual/Usage/Scanning.html
- Ubuntu manpage for clamscan(1): https://manpages.ubuntu.com/manpages/jammy/en/man1/clamscan.1.html
- mankier clamdscan(1): https://www.mankier.com/1/clamdscan
- EICAR test file download page: https://www.eicar.org/download-anti-malware-testfile/
- ClamAV users mailing list discussions regarding `clamdscan -r` and `--include` regex semantics

## Issues Found
1. **`--include` was passed glob patterns instead of regex.** The original used `clamscan -r --include="*.php" --include="*.js" /var/www/html/`. The clamscan man page documents `--include=REGEX` — `*.php` is not a valid (or correctly-matching) regex. Changed to `--include='\.php$' --include='\.js$'` and added a clarifying comment.
2. **`clamdscan -r` is not a documented option.** The clamdscan man page does not list `-r` / `--recursive`; clamdscan automatically recurses into directories. Removed `-r` from the three clamdscan examples and added a note explaining the default recursion behavior.
3. **`clamdscan --stdin` does not exist.** clamdscan reads from stdin when passed `-` as the filename (`cat file | clamdscan -`). Changed the pipe example accordingly and updated the comment.

## Review Notes
- The clamscan options used elsewhere (`--infected`, `--no-summary`, `--quiet`, `--max-filesize=100M`, `--scan-archive=yes`, `--log=`, `--exclude-dir=` with regex, `--move=`, `--remove=no`, `--recursive`) were all verified against the Ubuntu/Debian clamscan(1) manpage and are correct, including the megabyte suffix syntax (`xM`/`xm`) for `--max-filesize`.
- The exit codes documented (0 = clean, 1 = threats found, 2 = error) match the ClamAV manual.
- The EICAR URL `https://www.eicar.org/download/eicar.com.txt` currently 301-redirects but ultimately serves the EICAR signature, so `curl -LO` works as written. A more canonical alternative is `https://secure.eicar.org/eicar.com.txt`, but the current URL is functional and was not changed.
- The PHP example combines `escapeshellcmd` and `escapeshellarg`. This is usable but generally redundant (and can occasionally produce surprising escaping) — `escapeshellarg` alone is typically the recommended pattern. Left as-is since it is not technically incorrect.
- `clamav-freshclam` runs as a managed service on Ubuntu and its default of up to 24 checks per day matches the shipped freshclam.conf.
