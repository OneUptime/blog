# Validation Summary: How to Calculate Colocation Power from Real Server Draw

## Status
validated

## Post Type
Technical guide. The post includes electrical sizing formulas, a worked calculation, metering procedures, and redundant-feed testing instructions, so it qualifies for technical review despite containing no executable software code.

## Technologies Covered
- Colocation rack power and capacity planning
- AC input metering, rack PDUs, and BMC telemetry
- Server power supplies and A/B feed redundancy
- Real power, apparent power, true power factor, and three-phase distribution
- Continuous-load circuit sizing and rack cooling
- Automatic transfer switches

## Sources Consulted
- [ENERGY STAR: Utilize Built-in Server Power Management Features](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/utilize-built-server-power-management-features) — server watts reported through PSUs or BMCs and workload-dependent power management.
- [ENERGY STAR: Reduce Energy Losses from Power Distribution Units](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/reduce-energy-losses-power-distribution-units-pdus) — outlet and rack monitoring, historical trends, capacity alarms, and phase balance.
- [Schneider Electric: Rack Powering Options for High Density](https://www.se.com/us/en/download/document/SPD_NRAN-5TDSPN_EN/) — verified that the linked document landing page identifies the intended white paper and its coverage of feeds, connectors, overloads, and redundancy.
- [Schneider Electric: kVA Calculation](https://www.se.com/us/en/faqs/FA101600/) — single-phase and three-phase voltage/current relationships and conversion from kW using power factor.
- [Fluke: Power Quality Troubleshooting](https://media.fluke.com/f033acd9-255f-4ab9-8df8-b10600665261_original%20file.pdf) — true versus displacement power factor and harmonic effects.
- [Dell: PowerEdge XE8545 Hot Spare Feature](https://www.dell.com/support/manuals/en-us/poweredge-xe8545/xe8545_information_update_techsheet_ism/hot-spare-feature?guid=guid-c803e01d-ef55-4d12-a751-113234078b65&lang=en-us) — a PSU can carry the system load while a redundant PSU sleeps and returns on failure.
- [Schneider Electric: Standard and 100%-Rated Breakers](https://www.se.com/us/en/faqs/FA104355/) — continuous-load duration and standard-rated versus 100%-rated applications.
- [Schneider Electric: Circuit Breaker Ratings Explained](https://blog.se.com/datacenter/2014/06/12/clearing-confusion-80-vs-100-rated-circuit-breakers/) — mixed continuous/noncontinuous load calculation.
- [Schneider Electric: 100%-Rated PowerPacT B Breakers](https://www.se.com/ca/en/faqs/FA323730/) — enclosure and installation requirements.
- [Equinix: Power](https://docs.equinix.com/colocation/about/colo-power/) — kVA draw caps, redundant circuits, and regional usable-current allowances.
- [Equinix: Customer Installation Guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/) — phase balancing, airflow, provider-controlled PDU connections, and ATS restrictions.
- [Schneider Electric: Calculating Total Cooling Requirements for Data Centers](https://www.se.com/us/en/download/document/SPD_NRAN-5TE6HE_EN/) — verified the official cooling white paper landing page; the direct PDF could not be retrieved by the browser.

- [Rittal: 7 Keys to Adding Server Rack Cooling](https://www.rittal.com/us-en_US/Company/Rittal-Stories/7-Keys-to-Adding-Server-Rack-Cooling-No-Matter-Where-They-Are-Going) — manufacturer guidance confirming that IT heat output approximately equals electrical power consumption.

## Issues Found
1. **Possible double counting of fixed rack infrastructure.** The procedure first includes all rack loads in the measured peak, but its formula then adds fixed infrastructure unconditionally. Qualified that term as infrastructure not already included in the peak and clarified that the example's 0.15 kW management load is outside the measured 3.6 kW. This preserves the arithmetic while keeping the measurement boundary consistent.
2. **Incomplete feed-test sequence.** The checklist said to fail A, then B without stating that A must first be restored. Updated it to restore A and verify redundancy before failing B, then restore B. This makes the intended independent single-feed failure tests explicit and avoids interpreting the procedure as a simultaneous loss of both supplies.

## Review Notes
- Independently recalculated 3.60 + 0.45 + 0.15 = 4.20 kW, 4200 / (208 × 0.95) = 21.255 A (21.3 A rounded), and 4.20 / 0.95 = 4.421 kVA (4.42 kVA rounded).
- The current equations are correct using RMS voltage/current and true power factor; the three-phase expression assumes balanced loads and line-to-line voltage. Per-phase limits still apply.
- PSU wattage is conversion capacity, not a measurement of server AC demand. AC outlet measurement includes PSU losses; redundant PSU loading depends on hardware and configuration.
- Correlating rack measurements, testing representative workload combinations, reserving explicit growth, and sizing each surviving feed are sound planning practices. No physical metering or failover test was performed during this documentation review.
- A 24-hour baseline is an initial operational record, not proof that weekly or seasonal peaks have been captured. The earlier instruction to cover busy periods, backups, and other workload states remains necessary. Meter sampling and averaging can hide short transients; instrument capability should match the peak being assessed.
- Continuous-load and cooling guidance is correct at the stated level. Actual circuit approval depends on the adopted code, listed equipment, installation conditions, and provider. The approximately one-watt-of-heat-per-watt relationship describes total IT heat; liquid cooling can carry part of that heat directly out of the room.
- All six linked technical references resolve to the intended official resources. The author link is attribution, not technical evidence. No software versions, APIs, commands, or executable configuration require runtime testing.
- Changes are limited to the two technical ambiguities above; the post structure and numerical example are preserved.
