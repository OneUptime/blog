# Validation Summary: How to Set Up ZeroTier Virtual Network on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ZeroTier One (VL1/VL2, node IDs, network IDs)
- ZeroTier Central (hosted controller)
- ZeroTier self-hosted controller (local HTTP API)
- ztncui (web UI for self-hosted controllers)
- ZeroTier moons (federated root sets)
- Ubuntu (apt, systemd)
- iptables / iptables-persistent (NAT and forwarding)
- ufw firewall
- sysctl (IP forwarding)

## Sources Consulted
- [ZeroTier Documentation - Start / Install](https://docs.zerotier.com/start/)
- [ZeroTier Documentation - CLI](https://docs.zerotier.com/cli/)
- [ZeroTier Documentation - Moons](https://docs.zerotier.com/zerotier/moons/)
- [ZeroTier Documentation - Network Controller](https://docs.zerotier.com/controller/)
- [ZeroTierOne CLI man page (GitHub)](https://github.com/zerotier/ZeroTierOne/blob/dev/doc/zerotier-cli.1.md)
- [ZeroTierOne repository doc directory](https://github.com/zerotier/ZeroTierOne/tree/main/doc) (confirmed `contact@zerotier.com.gpg` exists)
- [ztncui GitHub repository](https://github.com/key-networks/ztncui)

## Issues Found

1. **Non-existent `zerotier-cli api` subcommand.** The "Self-Hosted Controller" section invoked `sudo zerotier-cli api /controller/network/...`. There is no `api` subcommand in `zerotier-cli` (the documented subcommands are `info`, `listpeers`/`peers`, `listnetworks`, `join`, `leave`, `set`, `get`, `listmoons`, `orbit`, `deorbit`, `dump`). Replaced it with a `curl` call to the local controller HTTP API at `http://localhost:9993/controller/network/<NODEID><6hex>` using the `X-ZT1-Auth` header and the auth token from `/var/lib/zerotier-one/authtoken.secret`, which is the actual official mechanism. Also replaced the trailing `sudo zerotier-cli listnetworks` (which only lists networks the node has *joined*, not networks the controller manages) with the correct `GET /controller/network` call.

2. **ztncui not installable via npm.** The post recommended `sudo npm install -g ztncui`, but ztncui is not published to the npm registry — the official installation methods are a deb package from key-networks.com, a Docker image (`ztncui-aio`), or a source clone (`git clone https://github.com/key-networks/ztncui && cd ztncui/src && npm install`). Replaced the instructions with the source-clone method, which works reliably and matches what the upstream README documents.

3. **Misplaced `orbit` command in the Moons section.** The first block under "On the machine you want to make a moon" started with `sudo zerotier-cli orbit <moon-node-id> <moon-node-id>`. The `orbit` command is used exclusively on *client* nodes to join an existing moon — it has no effect on the moon server itself (the moon is established by placing the generated `.moon` file in `moons.d`). Removed that erroneous first line; the orbit step remains correctly placed in the subsequent "On other nodes that should use this moon" block.

## Review Notes
- The GPG key URL `https://raw.githubusercontent.com/zerotier/ZeroTierOne/main/doc/contact%40zerotier.com.gpg` is valid — the file exists in the upstream repository.
- The `focal` apt component works on newer Ubuntu releases because ZeroTier ships statically-linked binaries, but readers on Ubuntu 22.04 (`jammy`) or 24.04 (`noble`) may prefer to substitute the matching release name for better long-term cleanliness. Not changed since the focal repo is still maintained and functional.
- ZeroTier Central's free tier is documented as "up to 25 devices across all networks" (not per network); the post's phrasing "free with up to 25 devices" is consistent with this.
- `zerotier-cli` accepts `-j` either before or after the subcommand in current versions, so `zerotier-cli info -j` works; the canonical form is `zerotier-cli -j info`. Left as-is.
- The peer-to-peer / planet-relay description, VL1/VL2 explanation, 10-digit node ID and 16-digit network ID claims, UDP/9993 port, and `stableEndpoints` IP/PORT format are all consistent with official documentation.
