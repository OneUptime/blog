# Validation Summary: How to Use the curl Command for HTTP Requests on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- curl (command-line HTTP client)
- Ubuntu / Linux shell scripting (bash)
- HTTP/HTTPS protocol fundamentals
- REST API interaction patterns
- TLS/SSL client options (mutual TLS, CA bundles)
- jq (used in scripting examples)
- .netrc credentials file
- .curlrc configuration file

## Sources Consulted
- Local `curl --help all` output (curl 8.5.0 on Ubuntu)
- Local `curl --version` output (confirms supported protocol list and feature set)
- curl man page / official documentation: https://curl.se/docs/manpage.html
- curl write-out format variables: https://everything.curl.dev/usingcurl/verbose/writeout.html
- curl config file syntax: https://everything.curl.dev/cmdline/configfile.html

## Issues Found
No technical issues found.

Verified specifically:
- All short flags used (`-o`, `-O`, `-L`, `-v`, `-s`, `-S`, `-f`, `-I`, `-D`, `-w`, `-X`, `-d`, `-F`, `-H`, `-A`, `-e`, `-u`, `-C`, `-k`) match curl's documented behavior.
- All long flags (`--netrc`, `--cacert`, `--cert`, `--key`, `--tlsv1.2`, `--limit-rate`, `--progress-bar`, `--max-time`) are correct.
- `-w` format variables (`%{http_code}`, `%{time_namelookup}`, `%{time_connect}`, `%{time_appconnect}`, `%{time_starttransfer}`, `%{time_total}`) are all valid.
- The `.curlrc` config syntax (long option names without leading `--`, `option = value` form) is valid per curl docs.
- "dozens of protocols" claim is accurate — curl 8.5.0 lists ~25 protocols (dict, file, ftp(s), gopher(s), http(s), imap(s), ldap(s), mqtt, pop3(s), rtmp, rtsp, scp, sftp, smb(s), smtp(s), telnet, tftp).
- The `-fsSL` idiom is correctly described as the standard combination for install scripts.
- Shell script idioms (`${data:+-d "$data"}` conditional expansion, `seq` loops, `[ "$x" -lt "$y" ]` numeric comparison, `mktemp` for temp files) are all correct bash.
- The `wait_for_service` logic (using `! check_endpoint` to loop while failing) is sound.

## Review Notes
- Minor caveat: the claim "It's installed by default on most Ubuntu systems" is true for Ubuntu Desktop and most cloud images, but minimal Ubuntu Server installs in older releases sometimes omitted it. This is a reasonable generalization and not worth changing.
- `-X POST` is technically redundant when `-d` is supplied (curl infers POST from `-d`), but including it for clarity in tutorial code is standard practice and not incorrect.
- `-k` / `--insecure` skips both certificate chain and hostname verification. The post's "use only for testing" warning is appropriate.
- The `wait_for_service` example uses a fixed 5-second interval; readers may want exponential backoff for production use, but the post's simpler form is fine for the tutorial context.
- `curl -f` returns exit code 22 specifically on HTTP errors (the post's "exit code > 0" wording is technically correct but less precise — left as-is since the broader statement is accurate).
