# How to Restore tcpdump, netcat, and Other Missing Tools on Minimal Photon OS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Networking, Troubleshooting

Description: Install missing diagnostics on minimal Photon OS using package ownership, trusted repositories, bounded packet captures, and tool-version checks.

---

Minimal Photon images deliberately contain fewer utilities than a general-purpose server installation. A missing `tcpdump`, `nc`, or `ss` command does not mean networking itself is broken. First identify the required diagnostic capability, then install the smallest appropriate package from the matching Photon repositories.

This guide assumes a standalone host you administer. A vendor appliance can restrict additional packages through its product support policy, so use that product's diagnostic procedure when applicable.

## Distinguish a missing binary from a PATH issue

Check the environment and installed commands:

```bash
cat /etc/os-release
printf '%s\n' "$PATH"
command -v tcpdump
command -v nc
command -v ip
command -v ss
```

If a command is missing only for a service or non-root account, compare PATH and permissions before installing another package. A binary can exist in an administrative directory absent from a restricted PATH.

Inspect the package inventory and repository state:

```bash
rpm -q tcpdump netcat
tdnf repolist
tdnf search tcpdump
tdnf search netcat
```

Package names and executable names need not match. In particular, the `netcat` package can provide the `nc` command. Use package metadata or the installed RPM file list rather than guessing names from another Linux distribution.

## Install the documented packages

Photon explicitly documents installation of `tcpdump` and `netcat` in its [network diagnostic package guide](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/installing-the-packages-for-tcpdump-and-netcat-with-tdnf/):

```bash
tdnf install tcpdump netcat
rpm -ql tcpdump
rpm -ql netcat
command -v tcpdump
command -v nc
```

Run the transaction as root or through authorized privilege escalation and review the dependencies. If repository access fails, repair DNS, time, TLS, or the current repository URL before retrying. Do not disable RPM signatures to obtain a troubleshooting utility quickly.

Current source packaging can split programs into smaller subpackages; the [tcpdump specification](https://github.com/vmware/photon/blob/5.0/SPECS/tcpdump/tcpdump.spec) is useful for understanding that arrangement. Prefer repository queries and installed metadata over hard-coding a particular split in your automation.

For another missing program, use `tdnf provides '*/PROGRAM'` when file-list metadata is available, replacing `PROGRAM` with the actual binary name. If the repository skips file lists, that query can be incomplete. Search the package catalog or inspect an approved package's file list instead.

## Test one TCP path with netcat

Read the installed command's help:

```bash
nc -h
```

Different netcat implementations have different flags and may return a nonzero exit code when displaying help. Photon maintains an [OpenBSD-derived netcat package](https://github.com/vmware/photon/blob/5.0/SPECS/netcat/netcat.spec); confirm the options in your installed version.

A TCP connection test with a connection timeout is:

```bash
nc -vz -w 3 database.example.com 5432
```

Replace the destination and port with an authorized service. The `-w 3` option limits each connection attempt; DNS resolution and attempts to multiple resolved addresses can make the total runtime longer than three seconds. Success means a TCP connection could be established; it does not prove that TLS, database authentication, or an application query works. Follow it with the actual application client when diagnosing those layers.

A UDP probe needs more careful interpretation because lack of a response does not reliably prove reachability. Use a protocol-aware request or packet capture when the result would otherwise be ambiguous.

## Capture a small amount of relevant traffic

Identify the correct interface with `ip -br link` and replace `eth0` below with that interface. Run live captures as root or with the required packet-capture capabilities. Then capture a limited number of packets for a specific peer and port:

```bash
tcpdump -i eth0 -nn -c 20 \
  'host 192.0.2.40 and tcp port 5432'
```

The address is a placeholder. Run the relevant application request while capturing. SYN retransmissions, immediate resets, and a completed handshake imply different next steps. Compare both directions before concluding that the remote application is at fault.

For a file capture, set a restrictive umask and bound the packet count:

```bash
umask 077
tcpdump -i eth0 -nn -c 100 -s 128 \
  -w /var/tmp/database-check.pcap \
  'host 192.0.2.40 and tcp port 5432'
```

A reduced snapshot length limits content but does not guarantee that sensitive data is absent. Protect captures, transfer them through approved channels, and remove them when the investigation no longer requires them.

## Preserve a repeatable diagnostic baseline

Record which packages were added and why. For frequently used hosts, include an approved diagnostic set in the image specification so incidents do not depend on repository access during an outage.

Avoid copying binaries from unrelated distributions: shared-library and architecture mismatches can produce misleading failures. Package-managed tools, documented command versions, and bounded tests produce evidence that another operator can reproduce and interpret.
