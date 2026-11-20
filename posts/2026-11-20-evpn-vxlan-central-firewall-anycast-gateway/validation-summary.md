## Documentation review

Reviewed RFC 9135 routing and anycast gateway behavior, Cisco NX-OS 10.1 services integration and 10.4 route-leaking documentation, and the tagged iproute2 6.12.0 route manual. Fortinet routing concepts were checked using the official indexed excerpt; the full page returned 403. Platform-specific examples are not presented as universally compatible configurations.

## Local checks

Executed the Python route-selection example with Python 3.11.13 and asserted that the /24 direct path wins. Checked Bash syntax and Mermaid structure (seven nodes, six edges). Diagram not rendered.

## Limitations

No switch, firewall, Linux VRF forwarding, session state, route import or failover was exercised. The Python example only models longest-prefix selection among installed routes. Read-only Linux commands were source-reviewed, not executed against a fabric.

## Image review

Generated social image visually reviewed; the full title is readable and fits within the frame.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
