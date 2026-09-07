# Validation Summary: How to Estimate How Many Servers a Colocation Rack Can Actually Support

## Status
validated

## Post Type
Technical capacity-planning guide. The post contains engineering formulas and implementation guidance, so it requires technical review despite having no executable software examples.

## Technologies Covered
- Colocation cabinets, rack units, server rails, and physical clearances
- AC real and apparent power, true power factor, three-phase distribution, and rack PDUs
- Redundant A/B power feeds and contractual draw caps
- Cooling capacity, airflow, containment, and blanking panels
- Rack payload, floor loading, equipment handling, and serviceability
- Network ports, optics, patch panels, uplinks, and dual-homing

## Sources Consulted
- [Schneider Electric: Rack Powering Options for High Density](https://www.se.com/us/en/download/document/SPD_NRAN-5TDSPN_EN/) — official document landing page; confirms scope covering phases, breakers, overload, and redundancy.
- [Schneider Electric: Planning Effective Power and Data Cable Management in IT Racks](https://www.se.com/us/en/download/document/SPD_VAVR-9G4NDJ_EN/) — official abstract supports the stated cooling and maintenance consequences; the article's APC URL redirects here.
- [Dell: PowerEdge installation and setup guidance](https://www.dell.com/support/kbdoc/en-us/000203859/install-and-setup-poweredge-rack-and-tower-servers-and-configure-idrac-and-ism-documentation-videos) — product-specific rail selection and cable-management components.
- [Dell PowerEdge XE9785L: Installing the system into the rack](https://www.dell.com/support/manuals/en-us/poweredge-xe9785l/pexe9785l_ism_pub/installing-the-system-into-the-rack?guid=guid-d298dfc8-b9cb-4af3-bdb1-6f19d2bfe9cd&lang=en-us) — recommends a rack lift and two or more people for the heavy sled.
- [Equinix: Power](https://docs.equinix.com/colocation/about/colo-power/) — true-power-factor definition, usable circuit limits, redundant pairs, and deployment draw caps.
- [Equinix: Customer Installation Guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/) — equipment placement, blanking unused slots, airflow direction, cabling, containment, and phase balancing.
- [Equinix: Cooling](https://docs.equinix.com/colocation/about/colo-cooling-intro/) — facility cooling and density planning context.

## Issues Found
- The reserved-U list treated blanking panels as a permanent space requirement. Changed it to reserve only equipment-design airflow-separation space and explain that blanking panels cover unused U positions. Equinix specifies blanking open slots; installing a server in such a slot does not require retaining a separate blank panel there.
- The power introduction described capacity after fixed equipment, while the formulas subtracted fixed equipment again. Clarified that the formula inputs are permitted totals before this subtraction. The worked example correctly uses already-net capacities and remains unchanged.

## Review Notes
- Independently checked the arithmetic: space = 19; real power = 16; apparent power = 16; cooling = 15; ports = 16. The minimum of 19, 16, 15, 25, and 16 is 15.
- The weight count of 25 is an illustrative assumption; no cabinet payload or server weights are supplied to independently derive it. The symbolic payload formula is correct for consistent weight units and identical installed server weights.
- Per-server division assumes a uniform server configuration. Design power must represent the intended workload and operating conditions; post-install measurements alone do not establish future peak demand.
- A cooling increase must reach at least 4.8 kW net to accommodate sixteen 0.30 kW servers. The stated next ceiling of sixteen assumes physical, phase, PDU-bank, redundancy, and serviceability checks also pass.
- Floor and route limits depend on the actual building and loaded cabinet, including cabinet tare weight. No site-specific structural rating is claimed or validated here.
- All six technical reference URLs resolve to the intended official resources. Schneider verification used landing-page descriptions, not the full white papers. Dell's linked rail compatibility matrix could not be retrieved by the browsing tool; the parent Dell article was accessible.
- No executable code, terminal commands, configuration schemas, APIs, or software version claims require runtime testing. The fenced blocks are mathematical pseudocode. No facility inspection, load test, or A/B failover test was performed.
