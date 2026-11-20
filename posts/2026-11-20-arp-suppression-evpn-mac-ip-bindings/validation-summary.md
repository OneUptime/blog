# Validation review

Reviewed EVPN MAC-only versus IP/MAC routes, kernel neighbor/FDB dependencies, suppression versus flood handling and staged enablement. Linux6.12 source and FRR/iproute2 documentation support the command examples and qualify the ordinary-request behavior.

Four shell snippets passed syntax checks. FRR commands were checked against10.2.1 source, and the bridge flag operation against iproute2 6.12.0. The diagram structure and generated social image were inspected; the title is readable and unclipped.

No FRR parser or live daemon, suppression flag change, kernel proxy reply, packet forwarding or mobility test was executed. The article does not equate missing state with universal ARP dropping. IPv6 and boot workflows are outside the example test scope. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
