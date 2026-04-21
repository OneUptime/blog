# Validation Summary: How to Subnet a Class B Network into Smaller Subnets

## Status
validated

## Post Type
Tutorial / networking guide

## Technologies Covered
- IPv4 addressing
- Class B and CIDR subnetting
- Python `ipaddress` module
- Route summarization and aggregation

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 791, Internet Protocol: https://datatracker.ietf.org/doc/html/rfc791
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- RFC 4632, Classless Inter-domain Routing (CIDR): https://datatracker.ietf.org/doc/html/rfc4632
- RFC 1878, Variable Length Subnet Table For IPv4: https://datatracker.ietf.org/doc/html/rfc1878

## Issues Found
- The final takeaway said the entire `/16` can always be summarized in BGP/routing as a single advertisement. That was too absolute: route summarization depends on topology, routing policy, and whether all more-specific routes are meant to be reachable through the aggregate. It is also important that `172.16.0.0/16` is private address space and should not be propagated across inter-enterprise links. Changed the sentence to say the `/16` can be summarized as a single internal route when the subnets share the same routing policy.

## Review Notes
- The subnet counts and usable-host counts are correct for modern CIDR subnetting of a `/16`, with subnet-zero/all-ones subnets allowed.
- The Python examples use current `ipaddress.IPv4Network`, `subnets(new_prefix=...)`, and `num_addresses` APIs and were verified locally with Python 3.12.3.
- The later Python snippets assume the earlier `import ipaddress` remains in scope. They are valid when run in sequence; future standalone examples could repeat the import for copy/paste convenience.
- The "Class B" terminology is historically accurate for a legacy `172.16.0.0/16` network, while CIDR is the current operational framing.
