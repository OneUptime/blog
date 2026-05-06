# Validation Summary: How to Calculate IPv4 Address Requirements for a New Office

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- CIDR subnetting
- DHCP scope planning
- Python standard library (`ipaddress`, `math`)
- VLAN address planning

## Sources Consulted
- Python Standard Library: `ipaddress` documentation — https://docs.python.org/3/library/ipaddress.html
- Python Standard Library: `math.ceil` documentation — https://docs.python.org/3/library/math.html#math.ceil
- IETF RFC 2131, Dynamic Host Configuration Protocol — https://datatracker.ietf.org/doc/html/rfc2131
- IETF RFC 4632, Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan — https://datatracker.ietf.org/doc/html/rfc4632
- IETF RFC 1918, Address Allocation for Private Internets — https://datatracker.ietf.org/doc/html/rfc1918
- Local execution of the published Python example with Python 3.12.3

## Issues Found
- The device inventory totals were inconsistent: the worksheet listed 10 printers but the VLAN totals omitted them. I assigned the printers to the corporate VLAN and corrected the per-VLAN totals to match the inventory.
- The subnet sizing formula treated DHCP reserve as if DHCP itself added protocol-level address overhead. I corrected the text so the subnet is sized from the planned host count first, then DHCP/admin reserve is left inside the chosen subnet as an operational planning choice.
- The Python calculator rounded planned host counts down with `int(...)`, which can undercount required capacity. I changed it to `math.ceil(...)`, added a basic positive-count guard, and updated the sample output to match the code's actual results.
- The original sample output and recommended subnet sizes did not match the calculator logic. I corrected the recommended sizes to `/23` for Corporate, `/25` for VoIP, `/24` for Guest, and `/27` for both IoT and Infrastructure, and updated the summarized `/22` allocation accordingly.
- The DHCP scope example claimed `10` static reservations for "servers, printers" even though those listed devices total more than 10 and the servers were placed in the infrastructure VLAN. I corrected that example to refer to printer reservations only.

## Review Notes
- The 10-15% DHCP/admin reserve guidance is a reasonable planning heuristic, but it is an operational policy choice rather than a DHCP protocol requirement.
- The Python example uses current standard-library APIs and was re-run after correction to verify that the printed recommendations match the published sample output.
