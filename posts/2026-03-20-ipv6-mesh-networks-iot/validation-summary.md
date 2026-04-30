# Validation Summary: How to Configure IPv6 Mesh Networks for IoT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6
- IEEE 802.15.4
- 6LoWPAN
- RPL
- Linux-wpan / `wpan-tools`
- `radvd`
- OpenThread / Thread
- RIOT OS GNRC networking stack
- Bash, Makefile, and C configuration examples

## Sources Consulted
- RFC 6550, RPL: https://www.rfc-editor.org/rfc/rfc6550
- RFC 4944, Transmission of IPv6 Packets over IEEE 802.15.4 Networks: https://www.rfc-editor.org/rfc/rfc4944
- RFC 6282, 6LoWPAN IPHC compression: https://www.rfc-editor.org/rfc/rfc6282.html
- Linux kernel IEEE 802.15.4 / 6LoWPAN documentation: https://docs.kernel.org/6.6/networking/ieee802154.html
- Linux-wpan documentation: https://linux-wpan.org/documentation
- OpenThread CLI command reference: https://openthread.io/reference/cli/commands
- OpenThread dataset management reference: https://openthread.io/reference/cli/concepts/dataset
- OpenThread Thread primer, network discovery and routing behavior: https://openthread.io/guides/thread-primer/network-discovery
- OpenThread overview / feature list: https://openthread.io/
- RIOT GNRC networking documentation: https://doc.riot-os.org/group__net__gnrc.html
- RIOT RPL API reference: https://doc.riot-os.org/rpl_8h.html
- RIOT shell documentation: https://doc.riot-os.org/c_tutorials/shell/
- RIOT shell command integration docs: https://doc.riot-os.org/group__sys__shell__commands.html
- RIOT pseudomodule reference: https://doc.riot-os.org/pseudomodules_8inc_8mk_source.html
- RIOT-2025.01 release notes: https://doc.riot-os.org/changelog/2025-01/
- `radvd.conf(5)` Debian manpage: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- Debian package metadata for `wpan-tools`: https://packages.debian.org/sid/wpan-tools
- Debian package metadata for `radvd`: https://packages.debian.org/stable/net/radvd

## Issues Found
- The Linux border-router section installed only `wpan-tools` even though the workflow also writes `/etc/radvd.conf` and starts `radvd`. I updated the install command to include `radvd`.
- The Linux border-router section manually set `short_addr`. RIOT's 2025.01 release notes document a known issue where RIOT nodes do not receive packets from Linux when `short_addr` is set, so I removed that line to avoid breaking the Linux-to-RIOT example described later in the post.
- The OpenThread section described Thread as "RPL-based", which is inaccurate. OpenThread's official docs describe Thread networking in terms of IPv6, 6LoWPAN, Mesh Link Establishment, and mesh routing, and the Thread primer describes route propagation as RIP-like rather than generic RPL. I corrected the wording to describe it as a Thread mesh implementation.
- The OpenThread section suggested `sudo apt-get install openthread-cli`, which is not how OpenThread's official documentation presents CLI usage. I replaced that with build/flash guidance for an OpenThread CLI image such as `ot-cli-ftd`.
- The OpenThread dataset placeholder was too vague (`<hexdump>`). The official CLI expects hex-encoded TLVs for `dataset set active`, so I changed the placeholder accordingly.
- The OpenThread `state` example implied the node would simply report `router`. OpenThread's Thread primer notes that devices initially attach as `child`, and router-capable devices can later become `router` or `leader`, so I corrected the expectation.
- The RIOT Makefile used `gnrc_sixlowpan_full`, which does not appear in the current RIOT pseudomodule list. I updated it to the currently documented `gnrc_sixlowpan_default`.
- The RIOT Makefile omitted `shell_cmds_default`, even though the post later tells readers to use `rpl` and `nib route` shell commands. I added `shell_cmds_default` so those shell integrations are available.
- The RIOT C example omitted `#include "shell.h"` and called `shell_run(NULL, NULL, 0)`, which does not match RIOT's documented shell usage. I updated the sample to allocate a shell buffer and call `shell_run(NULL, line_buf, SHELL_DEFAULT_BUFSIZE)`.
- The RPL overview and conclusion slightly overstated protocol behavior. I narrowed "the standard routing protocol" to "a standard routing protocol for many IPv6 mesh IoT networks" and changed the conclusion from "based on radio link quality" to "based on its objective function and link metrics", which better matches RFC 6550 / RFC 6552 behavior.

## Review Notes
- OpenThread is technically relevant to IPv6 mesh IoT networking, but it implements Thread rather than generic RPL. The corrected wording now keeps that distinction clear without removing the section.
- RIOT's GNRC docs note that IEEE 802.15.4 + `gnrc_ipv6_router_default` can pull in 6LoWPAN support automatically. Keeping an explicit 6LoWPAN pseudomodule in the example is still acceptable after updating it to a currently documented name.
