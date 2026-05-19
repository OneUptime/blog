# Validation Summary: How to Set Up a Snap Store Proxy for Enterprise Ubuntu Deployments

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Snap Store Proxy (Canonical's Ubuntu Pro Enterprise Store, formerly snap-store-proxy)
- Ubuntu (18.04+ / 20.04+)
- snapd / snap CLI
- PostgreSQL
- nginx (as TLS-terminating reverse proxy)
- certbot / Let's Encrypt
- systemd

## Sources Consulted
- [Snap Store Proxy documentation (Canonical)](https://documentation.ubuntu.com/snap-store-proxy/)
- [Enterprise Store documentation](https://ubuntu.com/enterprise-store/docs/)
- [Configuring snap devices](https://ubuntu.com/enterprise-store/docs/page/how-to/devices/)
- [Registration - Snap Store Proxy documentation](https://documentation.ubuntu.com/snap-store-proxy/en/register/)
- [How to control MicroK8s upgrades using a Snap Store Proxy](https://microk8s.io/docs/manage-upgrades-with-a-snap-store-proxy)
- [How to cache snap downloads and save bandwidth (Snapcraft blog)](https://snapcraft.io/blog/how-to-cache-snap-downloads-and-save-bandwidth)

## Issues Found

1. **Incorrect client snapd configuration command (Step 7).** The post originally used `sudo snap set core store.url=https://snap-proxy.corp.example.com` to point clients at the proxy. This is not a valid snapd configuration key. The correct procedure is documented in Canonical's docs as a two-step process: (a) fetch and `snap ack` the proxy's store assertion served at `/v2/auth/store/assertions`, then (b) set `proxy.store=<STORE_ID>` on the `core` snap. I replaced the incorrect line with the proper `curl ... | sudo snap ack /dev/stdin` followed by `sudo snap set core proxy.store="$PROXY_STORE_ID"`, and added the documented `proxy.store=''` disconnect command.

2. **Misleading `SNAPPY_STORE_NO_CDN` "alternative method" claim (Step 7).** The original post presented `SNAPPY_STORE_NO_CDN=1` as an alternative way to route a client through the proxy. This is incorrect — that environment variable disables CDN routing on the snap store side and is not a substitute for the assertion + `proxy.store` workflow. I removed this stanza so readers don't follow a non-working procedure.

## Review Notes

- The post uses the legacy `snap-store-proxy` snap name and the `snap-proxy` CLI rather than the newer `enterprise-store` snap / `enterprise-store` CLI that Canonical has rebranded to. Both names are still referenced in the wild, and the older snap continues to work, but readers should be aware that newer Canonical documentation uses the `enterprise-store` name. This is a future-proofing concern rather than a current factual error.
- The post uses `sudo snap set snap-store-proxy proxy.domain=...` and `sudo snap set snap-store-proxy store.db=...` style configuration. Canonical's documentation more commonly shows `sudo snap-proxy config proxy.domain=...` and (in newer versions) `proxy.db.connection` as the connection-string key. The `snap set` form has historically worked for the legacy snap, so no change was made, but the canonical `snap-proxy config` form would be more idiomatic.
- The post mentions port 8080 as the default; for some installations the default HTTP port is 80. Since the post frames it as a configurable option and provides an explicit `proxy.port=8080` setting, the example is internally consistent and was left as-is.
- The `snap-proxy generate-keys` step (typically run before `snap-proxy register` on the legacy proxy) is not shown in the post. The current `snap-proxy register` flow often handles key generation, so this omission is not a strict error.
- The high availability section is conceptually correct but lightweight; readers building HA deployments should consult the official docs for shared storage and PostgreSQL replication specifics.
