# Validation Summary: How to Use nfdump and nfsen to Analyze NetFlow Data

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nfdump (NetFlow analysis CLI)
- nfcapd (NetFlow capture daemon)
- nfsen (Perl-based web frontend for nfdump)
- NetFlow protocol
- systemd (service management)
- Apache + PHP (for nfsen frontend)
- Bash scripting (report automation)

## Sources Consulted
- nfcapd man page (phaag/nfdump): https://github.com/phaag/nfdump/blob/master/man/nfcapd.1
- nfdump man page (phaag/nfdump): https://github.com/phaag/nfdump/blob/master/man/nfdump.1
- nfdump filter cheatsheet (linked from official README): https://gist.github.com/phaag/06369bed7f39f97e1de51b1b0f5bc29a
- nfdump source `src/libnffile/util.c` (ScanTimeFrame / ParseTime8601 — confirms `-t` accepts only absolute ISO timestamps separated by `-`)
- nfdump source `src/nfdump/nfdump.c` (built-in help text — confirms `srcip4/24` aggregation form)
- nfsen download index on SourceForge: https://sourceforge.net/projects/nfsen/files/stable/
- nfsen 1.3.x source tree (mirror): https://github.com/p-alik/nfsen — confirms no shipped systemd unit

## Issues Found

1. **`nfcapd -w` flag misdescribed (Step 2).** The post commented `-w: rotate files every 5 minutes`, which is incorrect. In nfdump 1.6.x, `-w` synchronizes file rotation with wallclock minute boundaries; in 1.7.x, `-w <dir>` sets the output directory and would conflict with `-l`. Neither version uses `-w` to set the rotation interval — that is `-t <seconds>` (default 300s = 5 min). Replaced `-w` with `-t 300` in both the manual invocation and the systemd `ExecStart=` line, and updated the explanatory comment.

2. **`-filter` flag does not exist in nfdump (Steps 3 and 5).** The post used `-filter "..."` three times. nfdump has no such option — filters are passed as a trailing positional argument (tcpdump-style), and `-f` only reads filters from a file. Removed the `-filter` flag in all three places and moved the filter expression to the end of the command.

3. **`dport` is not a valid filter keyword (Step 3).** nfdump's filter primitive is `dst port <num>` (with a space), not `dport`. Changed `proto tcp and dport 80` to `'proto tcp and dst port 80'`.

4. **Time window syntax for `-t` was invalid (Step 3).** The post used `-t "now-300:now"` and `-t "...:..."` with a colon separator. nfdump's `-t` does not understand `now` or relative offsets — it requires absolute ISO timestamps `YYYY/MM/dd.hh:mm:ss`, and the start/end separator is a hyphen `-`, not a colon. Rewrote both `-t` invocations to compute absolute timestamps via `date -d` and use the hyphen separator.

5. **Heredoc to `/etc/systemd/system/nfcapd.service` would fail without root (Step 2).** `cat > /etc/systemd/...` is run by the user shell, not by `sudo`, so it fails with "permission denied" even though the surrounding commands use `sudo`. Replaced with `sudo tee /etc/systemd/system/nfcapd.service > /dev/null << 'EOF'` so the redirect happens with root privileges.

## Review Notes

- **nfsen 1.3.8 URL verified.** `https://sourceforge.net/projects/nfsen/files/stable/nfsen-1.3.8/nfsen-1.3.8.tar.gz` is real (released 2017-01-24); 1.3.8 remains the most recent stable release on SourceForge.
- **`sudo systemctl start nfsen` (Step 6) is left as-is.** nfsen does not ship a systemd unit; the install puts an init-style script at `/etc/init.d/nfsen` (or wherever configured). On modern systemd distributions, `systemd-sysv-generator` auto-wraps SysV init scripts as units, so `systemctl start nfsen` typically works in practice. If a reader's system has SysV-init compatibility disabled, they would need to write a custom `nfsen.service` unit.
- **Default nfcapd port is 9995**, but the post explicitly listens on 2055 via `-p 2055`, which is fine and a common choice for NetFlow v9/IPFIX exporters.
- **`-A srcip4/16`, `-A srcip,dstport`, all `-s` and `-o` forms in the post are correct** per nfdump's man page and built-in help.
- Verified `flags S` is a valid filter primitive (TCP SYN match) per the nfdump man page example `flags S and not flags AFRPU`.
- The conclusion uses an em-dash style ("investigations-detecting") with no spaces; left untouched as it is stylistic, not technical.
