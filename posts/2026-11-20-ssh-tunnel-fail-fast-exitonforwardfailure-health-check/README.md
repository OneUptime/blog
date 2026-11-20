# Fail Fast with SSH `ExitOnForwardFailure` and a Tunnel Health Check

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Networking, Troubleshooting

Description: Gate a job on an owned SSH forward and a bounded HTTPS readiness check, with separate startup, health, and job failures.

An SSH process can remain alive while its backend is unreachable. `ExitOnForwardFailure=yes` makes forwarding setup failures fatal; it does not test connections to the ultimate destination. A useful wrapper must establish its own listener, exercise the intended application, and run the job only after both succeed. [OpenSSH forwarding failure semantics](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5#ExitOnForwardFailure).

This example targets Linux, Python 3.11 or later, OpenSSH portable 9.9p1 semantics, and curl 8.4 or later with HTTPS and Unix socket support. It serves HTTP/HTTPS consumers that support Unix sockets; it does not establish or validate a separate TCP listener. The short-lived job wrapper has separate 15-second startup and readiness budgets and a 300-second job budget.

## Give this invocation its own endpoint

Starting `ssh ... &` and immediately polling a fixed local port is unsafe: an older tunnel or unrelated web server could return HTTP 200 before the new SSH process fails to bind.

For a curl-based job, use a fresh filesystem Unix socket inside a private temporary directory:

```text
local job → /tmp/ssh-ready-<random>/socket → SSH → api.internal.example:443
```

OpenSSH supports `-L local_socket:host:hostport`; the relay resolves and connects to that TCP destination. Python creates the directory exclusively with permissions limited to its owner. The socket cannot belong to a previous invocation. This assumes the local account and privileged processes are trusted. [OpenSSH forwarding syntax](https://man.openbsd.org/OpenBSD-7.6/ssh.1#L), [temporary directory guarantees](https://docs.python.org/3.11/library/tempfile.html#tempfile.mkdtemp).

Only this SSH child receives the new pathname. The wrapper waits for that socket and checks that the child remains alive before probing it. Socket existence alone is not readiness: the probe must complete HTTPS through it. There is no fixed TCP port to accidentally test or unknown listener to terminate.

Because the destination is TCP, accepted connections request `direct-tcpip` channels. The relay's TCP forwarding policy and destination restrictions must authorize `api.internal.example:443`; a local Unix listener does not bypass them. Authorization failures appear when the probe opens a channel. [Client channel selection](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/channels.c#L1859), [server authorization](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/serverloop.c#L395).

## Define the application's readiness contract

Replace the example host and endpoint with your service. Here `/ready` must return exactly HTTP 200 and the bytes `payments-api:ready` followed by one newline. That marker is an example application contract, not a standard health response. Use your service's real identity and readiness criteria; supply approved authentication if required.

curl's Unix socket option changes the connection path while the HTTPS URL retains the intended hostname. Certificate verification and application routing therefore still use `api.internal.example`. Keep verification enabled; add your organization's trusted `--cacert` file to both the probe and job when necessary. [Unix socket transport](https://curl.se/libcurl/c/CURLOPT_UNIX_SOCKET_PATH.html), [curl TLS verification](https://curl.se/docs/sslcerts.html).

## Supervise the forward and the job

Save this as `with-tunnel.py`. Provision an absolute `SSH_KEY_FILE` path containing a dedicated noninteractive credential and an absolute `SSH_KNOWN_HOSTS_FILE` path containing independently verified relay trust. This wrapper accepts filenames containing only letters, digits, `/`, `.`, `_`, and `-`, avoiding SSH filename expansion and quoting ambiguities. Replace the relay, account, and API values before running it. No key material is copied into the temporary directory.

```python
#!/usr/bin/env python3
import os
from pathlib import Path
import signal
import subprocess as sp
import sys
import tempfile
import time

def fail(status, message):
    print(message, file=sys.stderr)
    raise SystemExit(status)

def interrupted(number, frame):
    raise SystemExit(128 + number)

def stop(child):
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=2)
        except sp.TimeoutExpired:
            child.kill()
            child.wait()

for sig in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM):
    signal.signal(sig, interrupted)
if len(sys.argv) < 2:
    fail(2, "usage: with-tunnel.py COMMAND [ARG ...]")
files = [os.environ.get(name, "") for name in
         ("SSH_KEY_FILE", "SSH_KNOWN_HOSTS_FILE")]
try:
    valid_files = all(Path(p).is_absolute() and Path(p).is_file()
                      and all(c.isalnum() or c in "/._-" for c in p)
                      and os.access(p, os.R_OK) for p in files)
except OSError as error:
    fail(2, f"input: cannot inspect credential files: {error}")
if not valid_files:
    fail(2, "supply readable absolute files using letters, digits, /._-")
key, trust = files

with tempfile.TemporaryDirectory(prefix="ssh-ready-", dir="/tmp") as work:
    sock, body = Path(work) / "socket", Path(work) / "body"
    child = None
    stage = 20
    try:
        deadline = time.monotonic() + 15
        child = sp.Popen([
            "/usr/bin/ssh", "-F", "none", "-nNT", "-S", "none",
            "-o", "ForkAfterAuthentication=no",
            "-o", "ExitOnForwardFailure=yes",
            "-o", "StreamLocalBindUnlink=no",
            "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
            "-o", f"UserKnownHostsFile={trust}",
            "-o", "GlobalKnownHostsFile=/dev/null",
            "-o", "IdentityAgent=none", "-o", "IdentitiesOnly=yes",
            "-o", "ConnectTimeout=5", "-i", key,
            "-L", f"{sock}:api.internal.example:443",
            "tunnel@relay.example.net"], stdin=sp.DEVNULL)
        while True:
            if child.poll() is not None:
                fail(20, f"startup: ssh exited {child.returncode}")
            if time.monotonic() >= deadline:
                fail(20, "startup: listener deadline exceeded")
            if sock.is_socket():
                break
            time.sleep(0.1)

        stage = 21
        deadline = time.monotonic() + 15
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                fail(21, "health: readiness deadline exceeded")
            if child.poll() is not None:
                fail(21, f"health: ssh exited {child.returncode}")
            probe = sp.run([
                "/usr/bin/curl", "-q", "--noproxy", "*",
                "--silent", "--show-error", "--unix-socket", str(sock),
                "--connect-timeout", "2", "--max-time", str(min(3, remaining)),
                "--max-filesize", "1024", "--output", str(body),
                "--write-out", "%{http_code}",
                "https://api.internal.example/ready"],
                stdout=sp.PIPE, text=True, timeout=remaining)
            if (probe.returncode == 0 and probe.stdout == "200"
                    and body.read_bytes() == b"payments-api:ready\n"
                    and child.poll() is None
                    and time.monotonic() < deadline):
                break
            time.sleep(min(0.2, max(0, deadline - time.monotonic())))

        stage = 22
        result = sp.run(sys.argv[1:], timeout=300,
                        env=dict(os.environ, TUNNEL_SOCKET=str(sock)))
        if result.returncode:
            fail(22, f"job: command exited {result.returncode}")
    except sp.TimeoutExpired:
        fail(stage, f"stage {stage}: subprocess deadline exceeded")
    except OSError as error:
        fail(stage, f"stage {stage}: {error}")
    finally:
        if child is not None:
            stop(child)
```

The process stays in the foreground from OpenSSH's perspective: no `-f`, persistent master, or reused control socket. `-F none` excludes configured forwards, commands, and proxy settings; `-N` requests no remote command. This example requires a directly reachable relay. Reintroducing organizational configuration requires reviewing those assumptions. `StreamLocalBindUnlink=no` refuses to replace an existing socket pathname. [Client options](https://man.openbsd.org/OpenBSD-7.6/ssh.1), [portable Unix socket settings](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/ssh_config.5).

`ConnectTimeout` covers connection establishment and initial SSH handshake, not the entire workflow. The supervisor supplies the startup deadline. Readiness uses a monotonic deadline, bounded curl attempts, and an outer subprocess timeout. `-q` skips curl configuration, `--noproxy '*'` prevents proxy diversion, and redirects are not followed. curl 8.4 added enforcement of `--max-filesize` during transfers whose size was initially unknown. [SSH timeouts](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5#ConnectTimeout), [curl options](https://curl.se/docs/manpage.html), [monotonic clock](https://docs.python.org/3.11/library/time.html#time.monotonic).

## Make the consumer use the checked path

A job that connects directly to the API bypasses the check's path. For example, save this executable as `fetch-report.sh`, then invoke `python3 with-tunnel.py ./fetch-report.sh` with the two credential filenames exported:

```sh
#!/bin/sh
exec /usr/bin/curl -q --noproxy '*' --fail --show-error \
  --unix-socket "${TUNNEL_SOCKET:?}" --max-time 30 \
  https://api.internal.example/report
```

Exit 20 identifies failures detected during startup, 21 during readiness, and 22 during the job; the job's underlying return code is printed when it exits unsuccessfully. Input validation errors use 2, and handled signals use 128 plus the signal number. Failures while creating or removing the temporary directory, or while terminating SSH, fall outside those stage handlers and can instead exit 1 with a traceback; treat these as wrapper failures. A healthy probe is a point-in-time observation. The job still needs its own error handling if the application or tunnel subsequently fails.

Cleanup terminates only the recorded SSH child, waits two seconds before forcing termination, and removes only this invocation's temporary directory. Python's subprocess timeout kills and waits for the direct child; jobs must manage their own descendants. These are operational deadlines, not hard real-time guarantees: process creation and OS scheduling can delay enforcement. Repeated signals can interrupt cleanup, and SIGKILL or runner loss can bypass it, so use runner teardown for abandoned processes. [Python subprocess lifecycle and timeout limitations](https://docs.python.org/3.11/library/subprocess.html).
