# Validation Summary: How to Size A and B Colocation Power Circuits Safely

## Status
validated

## Post Type
Technical infrastructure sizing guide. The equations, capacity calculations, distribution constraints, and failover procedure constitute technical implementation details, even though there is no executable software code.

## Technologies Covered
- Redundant A/B colocation power circuits and UPS distribution
- NEC continuous-load sizing and standard versus 100-percent-rated breakers
- Single-phase and balanced three-phase AC power, true power factor, and apparent power
- Rack PDUs, outlet banks, automatic transfer switches, and dual-corded equipment
- Capacity planning, growth allowances, monitoring, and failover testing

## Sources Consulted
- NFPA LiNK, 2026 NEC: https://link.nfpa.org/all-publications/70/2026 — URL resolves to the JavaScript application; full code text was not accessible in the research tool.
- Schneider Electric, standard and 100-percent-rated breakers: https://www.se.com/us/en/faqs/FA104355/
- Schneider Electric, continuous and noncontinuous sizing explanation: https://blog.se.com/datacenter/2014/06/12/clearing-confusion-80-vs-100-rated-circuit-breakers/
- Schneider Electric, enclosure and conductor requirements: https://productinfo.se.com/nadigest/5c51d645347bdf0001f1f280/Master/17707_MAIN%20%28bookmap%29_0000054602.xml/%24/_17707056_16754
- Schneider Electric, Rack Powering Options for High Density: https://www.se.com/us/en/download/document/SPD_NRAN-5TDSPN_EN/ — checked the official abstract and V8 metadata; the download link did not return readable document content.
- Schneider Electric Electrical Installation Guide, apparent power and current equations: https://www.electrical-installation.org/enwiki/Installed_apparent_power_(kVA)
- Schneider Electric, PDU bank and phase load calculations: https://www.se.com/sg/en/faqs/FA156194/
- Schneider Electric, rack ATS scenarios and limitations: https://www.se.com/uk/en/faqs/FA156201/
- ENERGY STAR, intelligent PDU monitoring and capacity planning: https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/reduce-energy-losses-power-distribution-units-pdus
- Equinix, circuit usable capacity and contractual draw caps: https://docs.equinix.com/colocation/about/colo-power/
- Equinix, matching redundant pairs, diverse UPS systems, and single-circuit capacity: https://docs.equinix.com/colocation/colo-private-cage/
- Equinix, customer installation guidelines: https://docs.equinix.com/colocation/colo-customer-install-guidelines/

## Issues Found
1. **PDU bank limits were conflated with aggregate capacity.** The smallest-limit wording could imply that one lower-rated bank limits the entire PDU. Replaced it with a requirement to compare each component's failover load against its own applicable limit, explicitly limiting a bank's scope to its connected outlets. Schneider's PDU guidance distinguishes bank, phase, and total capacity.
2. **The conclusion overstated what a loaded failover test proves.** Opening rack feeds cannot establish the absence of shared upstream components. Updated the conclusion to check component limits through the loaded test and confirm upstream independence with the facility engineer and distribution documentation. This follows from the distinction between rack circuit transfer and the upstream UPS topology described by Equinix.

## Review Notes
- Independently checked the numerical examples: 4,200 / (208 × 0.95) = 21.255 A; apparent power = 4.421 kVA; equal sharing = 10.628 A per feed; headroom = 2.745 A (11.44% of 24 A); 15% growth = 24.443 A. The post's approximate figures are acceptable, including 10.7 A and 24.5 A calculated from the rounded 21.3 A baseline.
- The 80% relationship correctly applies to an entirely continuous load on a standard-rated circuit. Mixed loads retain the noncontinuous-plus-125%-continuous calculation. Manufacturer documentation corroborates these principles; this review did not directly inspect the full 2026 NEC text. The locally adopted edition and installation-specific rules remain controlling, as the post states.
- Current conversion assumes RMS voltage/current and power factor appropriate to the operating condition; the three-phase expression assumes a balanced load. Actual failover readings can differ with PSU efficiency, operating mode, voltage, and power factor. The post appropriately requires loaded testing and per-phase/neutral checks.
- Equinix's Private Cages documentation explicitly supports the matching-pair, diverse-UPS, and one-circuit-capacity claims. Its power documentation distinguishes contractual draw caps from circuit capacity and varies usable current by region and supply type.
- All six documentation URLs in the post point to the intended official resources, subject to the NFPA JavaScript and Schneider download limitations above. The author profile URL is a plausible GitHub profile link and is not technical evidence.
- No APIs, CLI commands, configuration formats, or executable examples required runtime testing. No physical electrical test was performed; validation concerns the guide's technical content, not approval of a particular installation.
