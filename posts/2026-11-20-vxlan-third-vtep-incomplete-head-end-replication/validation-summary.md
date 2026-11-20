# Validation summary

Executed the published Python checker with Python 3.11.13 against eight synthetic FDB inputs. Complete lists passed; missing, unexpected and duplicate peers were reported; unrelated learned/master entries were ignored; multicast, malformed top-level and empty input did not pass. Three shell examples pass syntax checks and published Python matches the executed file. Reviewed Linux 6.12 remote-list forwarding and iproute2 6.12.0 JSON and append behavior. Mermaid structure was checked, not rendered. The generated social image was visually inspected and is readable without clipping.

No live VXLAN topology, FDB mutation, controller operation or connectivity test was performed. The address-set comparison intentionally does not validate ports, VNI overrides, entry persistence, routes or actual delivery. The article scopes its mutation example to isolated manually managed staging.

## Checked sources

- https://www.rfc-editor.org/rfc/rfc7348.html
- https://raw.githubusercontent.com/torvalds/linux/v6.12/drivers/net/vxlan/vxlan_core.c
- https://raw.githubusercontent.com/torvalds/linux/v6.12/net/bridge/br_forward.c
- https://raw.githubusercontent.com/iproute2/iproute2/v6.12.0/bridge/fdb.c
- https://docs.python.org/3.11/library/ipaddress.html
- https://raw.githubusercontent.com/iproute2/iproute2/v6.12.0/man/man8/bridge.8

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
