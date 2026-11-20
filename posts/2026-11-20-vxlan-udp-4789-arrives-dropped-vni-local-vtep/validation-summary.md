## Documentation review

Reviewed Linux 6.12 VXLAN receive source, packet socket documentation, Linux VXLAN documentation, tagged iproute2 6.12.0 manuals, tcpdump 4.99.5 manual, and official nftables listing/tracing documentation. Conventional per-VNI devices are distinguished from metadata-based tunnel devices.

## Local checks

Five Bash blocks passed syntax checking. Applied the outer capture filter with local tcpdump 4.99.1 to the existing synthetic two-frame IPv4 VXLAN fixture; both records matched and decoded. Output retained under .tmp/vxlan-receive-drop-lab/. No traffic transmitted. Mermaid structurally checked for six nodes and five edges, not rendered.

## Limitations

No live capture, Linux receive path, bridge forwarding, nftables policy, tracing rule or hardware offload was exercised. The offline filter test cannot prove kernel acceptance or a particular drop reason.

## Image review

Generated social image visually reviewed. The title is readable and fits within the image.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
