# Validation Summary: How to Rotate tcpdump Capture Files Automatically

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- tcpdump
- PCAP capture files
- Linux shell commands
- systemd service units
- cron
- GNU findutils

## Sources Consulted
- The Tcpdump Group tcpdump man page source: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in
- Local `tcpdump(1)` man page and `tcpdump --help` for tcpdump 4.99.4
- systemd service documentation: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.service.xml
- systemd unit specifier documentation: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.unit.xml
- systemd syntax documentation: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.syntax.xml
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Debian `crontab(5)` man page: https://manpages.debian.org/testing/cron/crontab.5.en.html

## Issues Found
- The introduction implied tcpdump rotation always provides automatic cleanup. Updated it to distinguish size-based circular retention, repeating time-based filenames, and cleanup jobs.
- The time-rotation example used `-G` with `-W` as if it kept the last 24 files. tcpdump documents that `-W` with `-G` limits the number of rotated files and exits instead of acting as a circular buffer. Changed the example to use a repeating hourly filename.
- The combined `-C` and `-G` example claimed `-W 20` kept 20 files. tcpdump documents that `-W` is ignored for retention when `-C` and `-G` are used together. Removed `-W` and noted that cleanup must be handled separately.
- The systemd service used unescaped strftime percent signs. systemd treats `%` as a unit specifier, so changed the tcpdump filename pattern to use `%%`.
- The systemd service combined `-G` and `-W` for continuous retention. Replaced that with a repeating 144-slot time-of-day filename pattern.
- The service used `/usr/sbin/tcpdump`, which is not portable across current Linux distributions. Changed `ExecStart` to use `tcpdump`, which current systemd resolves from its documented executable search path.
- Commands writing to `/var/pcap` could fail on tcpdump builds that drop privileges before opening output files. Added `-Z root` where the examples write to the root-owned capture directory.

## Review Notes
The corrected examples were checked against tcpdump 4.99.4 local help/man output, and the patched systemd unit syntax was verified with `systemd-analyze verify`. A future hardening pass could avoid `-Z root` by creating a dedicated writable capture directory for the tcpdump privilege-drop user.
