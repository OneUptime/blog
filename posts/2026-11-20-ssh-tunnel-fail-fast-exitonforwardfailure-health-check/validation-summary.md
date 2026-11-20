# Validation Summary: Fail Fast with SSH `ExitOnForwardFailure` and a Tunnel Health Check

## Status
validated

## Post Type
Tutorial / operational guide with Python and shell examples.

## Technologies Covered
- OpenSSH portable 9.9p1, SSH local forwarding, Unix sockets, and TCP forwarding authorization.
- Python 3.11+ subprocess management, temporary directories, signals, and monotonic deadlines.
- curl 8.4+, HTTPS certificate verification, readiness checks, and Unix socket transport.
- Linux process supervision and POSIX shell command execution.

## Sources Consulted
- [OpenBSD 7.6 ssh(1)](https://man.openbsd.org/OpenBSD-7.6/ssh.1): forwarding syntax, configuration isolation, foreground operation, and connection-sharing controls.
- [OpenBSD 7.6 ssh_config(5)](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5): forwarding failures, connection timeout, authentication, and host-key options.
- [OpenSSH 9.9p1 configuration manual source](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/ssh_config.5): version-pinned configuration semantics, including StreamLocalBindUnlink.
- [OpenSSH 9.9p1 channels.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/channels.c): channel selection for a Unix listener with a TCP destination.
- [OpenSSH 9.9p1 serverloop.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/serverloop.c#L395): direct-tcpip authorization.
- [curl command-line manual](https://curl.se/docs/manpage.html): probe and consumer flags, transfer bounds, HTTP status output, and the curl 8.4.0 max-filesize behavior change.
- [curl Unix socket transport](https://curl.se/libcurl/c/CURLOPT_UNIX_SOCKET_PATH.html): connection endpoint and DNS behavior.
- [curl TLS verification](https://curl.se/docs/sslcerts.html): default certificate validation and hostname verification.
- [curl 8.4.0 output handling](https://raw.githubusercontent.com/curl/curl/curl-8_4_0/src/tool_operate.c) and [output file creation](https://raw.githubusercontent.com/curl/curl/curl-8_4_0/src/tool_cb_wrt.c): successful empty responses create or truncate the output file.
- [Python 3.11 subprocess](https://docs.python.org/3.11/library/subprocess.html): run, Popen, timeout behavior, return codes, termination, and process creation limitations.
- [Python 3.11 tempfile](https://docs.python.org/3.11/library/tempfile.html): exclusive private directory creation and automatic cleanup.
- [Python 3.11 time](https://docs.python.org/3.11/library/time.html#time.monotonic): monotonic deadline calculation.
- [Python 3.11 pathlib](https://docs.python.org/3.11/library/pathlib.html#pathlib.Path.is_socket): socket detection and filesystem operations.
- [Python 3.11 signal](https://docs.python.org/3.11/library/signal.html#signal.signal): signal handlers and exception-based interruption.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. Its distinction between successful forwarding setup and application readiness is correct, as is its use of a private per-invocation Unix socket to avoid checking an unrelated fixed-port listener.
- Confirmed that a Unix listener targeting a TCP destination uses direct-tcpip channels and remains subject to the relay's TCP forwarding restrictions.
- The probe requires curl success, exactly HTTP 200, the exact application marker, a live SSH child, and time remaining. TLS verification remains enabled, redirects are not followed, and the consumer explicitly uses the checked socket.
- The 15-second startup and readiness budgets and 300-second direct-job timeout match the code. The text correctly qualifies scheduling delays, descendant-process management, cleanup exceptions, and signals that can bypass cleanup. Readiness remains a point-in-time observation; SSH is not continuously polled while the job runs.
- Python syntax parsing and shell syntax checking passed. Executing the extracted Python example without a command and with missing credential variables returned the documented status 2.
- A local HTTP experiment with curl 8.7.1 confirmed that an empty HTTP 200 response truncates a previously populated output file. Inspection of curl 8.4.0 source confirmed the corresponding behavior at the stated minimum version; the reused body pathname does not create that suspected stale-response issue.
- Referenced technical URLs identify the appropriate official documentation or version-pinned source. The GitHub-rendered configuration manual could not be fetched through the browser tool, so its official raw source was consulted instead.
- No live end-to-end SSH/HTTPS deployment was tested: the relay and API names are placeholders, and dedicated credentials and service trust were not supplied. Local execution checks ran on macOS; the article explicitly targets Linux. The named OpenSSH release is a semantics baseline, not a claim to be the latest release.
