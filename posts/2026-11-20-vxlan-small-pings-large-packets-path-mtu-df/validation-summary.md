# Validation review

Reviewed packet-size accounting, Linux ping options, VXLAN outer DF policy, and the distinction between local rejection and remote packet loss against the linked official sources.

Synthetic Ethernet/VXLAN captures confirmed inner lengths 1450/1500 and outer IPv4 lengths 1500/1550, including different outer DF settings with inner DF set. The local tcpdump decoder read both frames and compiled the article filter. Four shell examples passed syntax checks; the table and Mermaid structure were checked. The generated social image was visually inspected and has no clipped title.

No live Linux network, ping, fragmentation, or path-MTU experiment was performed. Synthetic decoding does not validate wire behavior. The diagram was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
