# Validation Summary: How to Use wget with IPv6 Addresses

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GNU wget (HTTP/HTTPS/FTP downloader)
- IPv6 addressing and URL syntax (RFC 3986 / RFC 2732)
- curl (referenced for comparison)
- Bash scripting
- wgetrc configuration file

## Sources Consulted
- `wget --help` output (GNU Wget 1.21.4)
- GNU wget manual: https://www.gnu.org/software/wget/manual/wget.html
- RFC 3986 — URI Generic Syntax (bracketed IPv6 in URLs)
- RFC 2732 — Format for Literal IPv6 Addresses in URLs
- curl manual for comparison flags (`-6`, `-#`, `-L`, `-I`, `--resolve`)

## Issues Found
- **wgetrc "force IPv6 always" directive was wrong.** The original had two identical `prefer-family = IPv6` lines, with the second (commented) labeled "force IPv6 always". `prefer-family` only *prefers* an address family; it does not force it. Changed the commented second line to `#inet6-only = on`, which is the correct wgetrc directive (equivalent to the `--inet6-only` / `-6` CLI flag) that actually forces IPv6-only.

## Review Notes
- All CLI flags shown (`-6`, `--inet6-only`, `-4`, `--inet4-only`, `--server-response`, `--spider`, `-q`, `-O`, `--progress`, `-P`, `-c`, `-i`, `-r`, `-l`, `--mirror`, `--convert-links`, `--no-parent`, `-A`, `--header`) verified against `wget --help` on GNU Wget 1.21.4.
- IPv6 URL bracket syntax (`http://[2001:db8::1]/`) is correct per RFC 3986 §3.2.2 / RFC 2732.
- The `wget vs curl` comparison table is accurate: curl does require `-L` to follow redirects (wget follows by default), and curl's `-#` is indeed its progress-bar flag.
- Minor caveat (not a correction): `wget --spider` issues a HEAD request in most cases but may fall back to GET for recursive retrieval — adequately captured by the table's characterization.
- The script example relies on `--server-response` output still being printed when `-q` is set; this works on current GNU wget because server responses are logged at a level above normal verbose output.
