# Validation Summary: How to Use the wget Command for Downloading Files on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- GNU Wget (1.x, verified against 1.21.4)
- Bash scripting
- Ubuntu Linux
- HTTP/HTTPS, basic auth, .netrc
- TLS/SSL (`--secure-protocol`)
- sha256sum

## Sources Consulted
- `wget --help` and `man wget` output on Ubuntu (GNU Wget 1.21.4)
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html
- Verified behavior of `--netrc`, `--no-netrc`, `--wait`, `--waitretry`, `--no-parent`, `--tries`, `--mirror`, `--secure-protocol` against the live binary
- wgetrc reference (`/etc/wgetrc`) for configuration file syntax

## Issues Found
1. **`--wait=10` annotated as "Wait 10 seconds between retries"** — `-w` / `--wait=SECONDS` waits between *retrievals*, not specifically between retries. `--waitretry` is the option for retry delays. Updated the comment to say "Wait 10 seconds between retrievals" to match the documented behavior. The next example in the same block already correctly uses `--waitretry=30`.
2. **`--no-parent` annotated as "Stay within the same domain (don't follow external links)"** — `--no-parent` (`-np`) prevents ascending to the parent directory during recursive downloads; it has nothing to do with cross-domain following. Wget already restricts recursion to the same host by default (you need `-H` / `--span-hosts` to follow external hosts). Updated the comment to accurately describe the flag.

## Review Notes
- `--netrc` is accepted by wget even though `--help` only lists `--no-netrc`; it's an auto-generated boolean flag from the `netrc` wgetrc setting (the default is already on). The post's usage is valid.
- `--tries=0` for unlimited retries is correct (per man page, "Specify 0 or inf for infinite retrying").
- Default tries is 20 — claim is correct.
- `wget -b` with `-o LOGFILE` correctly overrides the default `wget-log` filename.
- `--mirror` is equivalent to `-r -N -l inf --no-remove-listing` per the manual; the post's description "recursive, infinite depth, timestamps" is accurate (it also keeps FTP listings, but that's not relevant for the HTTPS examples).
- `--secure-protocol=TLSv1_2` is a valid value (others: auto, SSLv2, SSLv3, TLSv1, TLSv1_1, TLSv1_2, TLSv1_3, PFS).
- The intro calls wget "Ubuntu's built-in" downloader — wget is pre-installed on most Ubuntu desktop and server images, so this is accurate in practice though technically it is a separate `wget` apt package.
- The example SHA-256 in the verify script is explicitly marked "example only" — fine.
