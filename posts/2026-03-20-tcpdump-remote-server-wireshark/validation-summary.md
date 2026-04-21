# Validation Summary: How to Capture Packets on a Remote Server with tcpdump and Analyze in Wireshark

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- tcpdump
- Wireshark
- TShark
- SSH and OpenSSH client configuration
- sudoers NOPASSWD rules
- Linux file capabilities with setcap
- GNU timeout
- pcap capture filters

## Sources Consulted
- tcpdump(8) manual page: https://www.man7.org/linux/man-pages/man8/tcpdump.8.html
- Wireshark command-line manual page: https://www.wireshark.org/docs/man-pages/wireshark
- TShark command-line manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- pcap-filter capture filter syntax: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- OpenSSH ssh_config(5) manual page: https://man.openbsd.org/ssh_config.5
- sudoers manual page: https://www.sudo.ws/docs/man/sudoers.man/
- GNU Coreutils timeout manual: https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html
- setcap(8) manual page: https://man7.org/linux/man-pages/man8/setcap.8.html
- Linux capabilities(7) manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local command checks: `tcpdump --help`, `tcpdump -d` filter compilation, `ssh -G`, `setcap -h`, and `timeout --help`

## Issues Found
- The live streaming examples used `tcpdump -w -` without `-U`. tcpdump documents that `-w` output to a file or pipe is buffered and readers may not see packets until the buffer fills. Added `-U` to streamed tcpdump commands and updated the explanation and conclusion to describe packet-buffered output.
- The timed capture example used `sudo timeout 30 tcpdump ...`, which does not align with the later tcpdump-only sudoers NOPASSWD rule. Changed it to `timeout 30 sudo tcpdump ...` so the privileged command remains tcpdump.
- The sudoers example hard-coded `/usr/sbin/tcpdump`, which is distribution-dependent. Updated the example to use `/usr/bin/tcpdump` with an explicit note to adjust it based on `command -v tcpdump`, and updated the setcap command to resolve the installed tcpdump path.
- The SSH key authentication note implied it resolved sudo password prompts. Clarified that `ssh-copy-id` avoids SSH login password prompts; passwordless sudo or file capabilities are still needed for tcpdump privileges.
- The tcpdump buffer comment said `-B 65536` is 64MB. tcpdump documents `-B` in KiB, so this is 64 MiB; updated the comment accordingly.

## Review Notes
- The commands are technically valid for current tcpdump, Wireshark/TShark, OpenSSH, sudoers, setcap, and GNU timeout behavior as documented above.
- `not port 22` assumes SSH is using the default port. For servers using a nonstandard SSH port, the filter should exclude that port instead.
- Interface names such as `eth0` and `ens3` are examples and must match the remote server's actual interface names.
- Wireshark and TShark were not installed in the local environment, so their CLI behavior was verified against the official Wireshark manual pages rather than executed locally.
