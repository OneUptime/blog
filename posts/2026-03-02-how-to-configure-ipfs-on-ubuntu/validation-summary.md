# Validation Summary: How to Configure IPFS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- IPFS
- Kubo
- systemd
- Nginx
- DNSLink
- IPNS

## Sources Consulted
- Kubo installation documentation: https://docs.ipfs.tech/install/command-line/
- Kubo CLI reference generated from Kubo 0.41.0 help text: https://docs.ipfs.tech/reference/kubo/cli/
- Kubo configuration reference: https://github.com/ipfs/kubo/blob/master/docs/config.md
- Kubo basic CLI guide: https://docs.ipfs.tech/how-to/kubo-basic-cli/
- Kubo command-line quick start: https://docs.ipfs.tech/how-to/command-line-quick-start/
- Secure Kubo RPC with TLS and HTTP Auth: https://docs.ipfs.tech/how-to/kubo-rpc-tls-auth/
- Kubo garbage collection guide: https://docs.ipfs.tech/how-to/kubo-garbage-collection/
- IPNS publishing guide: https://docs.ipfs.tech/how-to/publish-ipns/
- DNSLink gateway guide: https://docs.ipfs.tech/how-to/websites-on-ipfs/dnslink-gateway/

## Issues Found
- `Gateway.NoFetch` was configured without `--json`, which can write the value as a string instead of a boolean. Changed it to `ipfs config --json Gateway.NoFetch false`.
- The gateway comment said the gateway was off by default on some versions. Current Kubo defaults bind the gateway to localhost, and `Gateway.NoFetch` controls whether the gateway fetches remote content. Updated the comment to reflect that behavior.
- The IPNS publish example passed a bare CID. Current Kubo documentation shows `ipfs name publish` with an IPFS path. Changed the command to `ipfs name publish /ipfs/<CID>`.
- The post attributed slow IPNS resolution to a short TTL. Kubo's default IPNS record lifetime is 48 hours; the more accurate caveat is that mutable records require name-system resolution. Reworded the sentence accordingly.
- The "Bandwidth Configuration" section claimed the shown commands set max bandwidth to 100 MB/s. `Swarm.ResourceMgr.MaxMemory` limits libp2p networking memory, and `Swarm.ConnMgr.*Water` tunes connection-manager watermarks; they are not bandwidth caps. Reworded the section and comments to describe connection and resource tuning accurately.
- `ipfs object stat` is removed in current Kubo and the CLI reference says to use DAG or files commands instead. Replaced it with `ipfs dag stat`.
- `ipfs dht findprovs` is removed in current Kubo and the CLI reference says to use routing commands instead. Replaced it with `ipfs routing findprovs`.

## Review Notes
- The GitHub release download flow is plausible because Kubo publishes releases there, but the official installation guide primarily recommends `dist.ipfs.tech` for prebuilt binaries.
- Exposing `Addresses.API` or `Addresses.Gateway` on `0.0.0.0` is technically valid but security-sensitive. The post includes warnings for the API; public gateway operators should also consider `Gateway.NoFetch`, firewalling, and `Gateway.PublicGateways`.
