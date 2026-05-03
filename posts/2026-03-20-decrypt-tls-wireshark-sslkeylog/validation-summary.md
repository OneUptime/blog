# Validation Summary: How to Decrypt TLS Traffic in Wireshark with SSLKEYLOGFILE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark / tshark
- TLS (including ECDHE / TLS 1.3)
- SSLKEYLOGFILE (NSS Key Log Format)
- tcpdump
- Google Chrome, Mozilla Firefox
- curl
- Python (requests / urllib3)

## Sources Consulted
- Wireshark TLS protocol docs: https://wiki.wireshark.org/TLS
- NSS Key Log Format spec (referenced via Mozilla NSS): https://firefox-source-docs.mozilla.org/security/nss/legacy/key_log_format/index.html
- curl SSLKEYLOGFILE docs (everything-curl): https://everything.curl.dev/usingcurl/tls/sslkeylogfile.html
- curl manpage: https://curl.se/docs/manpage.html
- curl GitHub discussion #9617 (SSLKEYLOGFILE for curl)
- Python ssl module / urllib3 docs (SSLKEYLOGFILE support via standard ssl in Python 3.8+)
- tcpdump manpage: https://www.tcpdump.org/manpages/tcpdump.1.html
- tshark manpage: https://www.wireshark.org/docs/man-pages/tshark.html

## Issues Found
1. **Windows command had a literal tab character.** The line `set SSLKEYLOGFILE=C:	ls-keys.log` contained an actual tab (the `\t` had been interpreted in the original source). Fixed to `set SSLKEYLOGFILE=C:\tls-keys.log`.
2. **`curl --sslkeylogfile` flag does not exist.** The post claimed `curl 8.6+` supports a `--sslkeylogfile` CLI option. curl has never shipped such a flag — SSLKEYLOGFILE is supported only via the environment variable (since 7.58.0, when ENABLE_SSLKEYLOGFILE became default for OpenSSL/BoringSSL builds). Removed the bogus flag-based example and kept the correct env-var form, with a clarification about which TLS backends support the feature.
3. **Certificate-pinning bullet was incorrect.** The post said SSLKEYLOGFILE "Does not work if the server is using certificate pinning on the client". SSLKEYLOGFILE captures session keys from the legitimate client itself — it is not a MITM technique, so certificate pinning has no effect on it. Replaced the bullet with a correct related caveat: it does not work for applications whose TLS stack does not expose session keys (e.g., many native mobile apps, older Java/.NET runtimes).

## Review Notes
- The Wireshark preference name "(Pre)-Master-Secret log filename" and the tshark preference key `tls.keylog_file` are both current as of recent Wireshark 4.x releases.
- SSLKEYLOGFILE works for TLS 1.3 because Wireshark also understands the TLS 1.3 secret labels (`CLIENT_HANDSHAKE_TRAFFIC_SECRET`, etc.) that Chrome, Firefox, and OpenSSL emit.
- Python's standard `ssl` module honors `SSLKEYLOGFILE` natively only since Python 3.8 — worth keeping in mind for older runtimes.
- The tcpdump filter `'port 443'` is fine for typical HTTPS but will miss traffic on non-443 ports (e.g., QUIC/HTTP/3 on UDP 443 won't be captured by a tcp/port filter); not a correctness issue for the post's scope.
- `google-chrome &` works on most Linux distros; on macOS it would more typically be `open -a "Google Chrome"`. Not technically wrong as written (the post header says Linux/macOS), but a minor portability note.
