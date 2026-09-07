# How to Size A and B Colocation Power Circuits Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Power, Circuit Breaker, High Availability, Capacity Planning

Description: Size redundant A and B feeds for continuous load, failover, power factor, growth, and the weakest component in the distribution path.

---

An A/B rack is redundant only when either side can carry the required load after the other side fails. Normal current may be split across two feeds, but circuit sizing must use the surviving-feed case.

## Clarify what the 80 percent rule means

In the United States, the National Electrical Code defines a continuous load as one whose maximum current is expected to continue for three hours or more. For a standard-rated branch circuit or feeder, the simplified sizing relationship is:

```text
minimum rating = noncontinuous current + (1.25 x continuous current)
```

Other simultaneous-load, conductor-ampacity, adjustment, receptacle, and equipment rules still apply.

Only when the load is entirely continuous can that be rearranged as:

```text
maximum continuous current = circuit rating / 1.25
                           = circuit rating x 0.80
```

A 30 A standard-rated circuit therefore commonly supports 24 A of an all-continuous load, not 30 A. This is not a universal rule for every country or assembly. A 100-percent-rated application requires the complete listed assembly, including the overcurrent device, enclosure, conductors, and installation conditions. Use the code edition adopted locally, installed circuit details, provider rules, facility engineer, and authority having jurisdiction.

## Calculate the protected load

Inventory every device and classify it:

- dual-corded, with one cord on A and one on B
- single-corded behind a rack automatic transfer switch
- single-corded and not protected from a feed failure
- fixed infrastructure such as switches, console servers, and PDU controllers

Use measured maximum sustained real power plus approved growth. Convert using true power factor, where `kVA = kW / true power factor`:

```text
single-phase amps = watts / (volts x true power factor)
balanced three-phase amps = watts / (sqrt(3) x line-to-line volts x true power factor)
```

For 4.2 kW at 208 V and a 0.95 power factor:

```text
4,200 / (208 x 0.95) = 21.3 A
```

The load is 4.42 kVA and fits within the usual 24 A continuous allowance of a 30 A standard-rated circuit. In normal balanced operation, the PDUs may show about 10.7 A each. After A fails, B can rise to the full 21.3 A. For three-phase feeds, check every phase and neutral as applicable. The design must also fit the provider's contractual kVA draw cap and any lower PDU or facility limit.

## Apply growth to the failure case

Check headroom on the surviving feed, not on the normal reading:

```text
surviving-feed headroom = permissible continuous amps - failover amps
```

The example has `24 - 21.3 = 2.7 A`, or about 11 percent of the permissible current. A planned 15 percent load increase would produce roughly 24.5 A and no longer fit. Resolve that before installation by reducing the load, increasing voltage where supported, selecting a larger approved circuit, or dividing equipment across failure domains.

Avoid adding an arbitrary percentage twice. If the device model already includes measured growth, do not add another blanket growth factor at the circuit level.

## Check every link in both paths

The breaker is only one constraint. For A and B separately, record:

- source and upstream UPS or generator path
- breaker rating and continuous-load allowance
- voltage, phase, receptacle, and connector rating
- rack PDU input, bank, branch, outlet, and cord ratings
- automatic transfer switch rating and transfer time
- provider alarm and enforced shutdown thresholds

The usable capacity is the smallest applicable limit. A 30 A branch circuit does not help if a PDU bank or transfer switch is rated lower.

Ask the provider to identify shared upstream components and the contractual capacity of the pair. Two receptacles labelled A and B may still share a panel, UPS module, maintenance bypass, or generator. Separate colors and PDUs do not prove end-to-end independence. Equinix, for example, documents matching primary and redundant circuits fed by diverse UPS systems and requires the pair's load to remain within one circuit's capacity. Other providers can define redundancy and draw caps differently.

## Test load transfer safely

Perform a documented failover test with facility approval:

1. establish steady representative load
2. record A and B current, real power, voltage, and alarms
3. open the approved A-side point, without pulling arbitrary live connectors
4. verify all protected equipment remains online and B stays below its limit
5. restore A and allow power supplies to stabilize
6. repeat for B

Watch for inrush, PSU mode changes, transfer-switch delay, and devices accidentally connected to only one side. A test at idle does not prove the design at peak load.

Set warning and critical thresholds below the actual limit so operators have time to act. Document which new device additions require recalculating the failure case.

## Conclusion

Treat A/B as two complete survival paths. Convert measured design watts to amps, apply the governing continuous-load rule, size each side for full failover, and verify the weakest component and upstream independence through an approved loaded test.

## Official Documentation

- [NFPA LiNK published 2026 National Electrical Code](https://link.nfpa.org/all-publications/70/2026)
- [Schneider Electric explanation of standard and 100-percent-rated breakers](https://www.se.com/us/en/faqs/FA104355/)
- [Schneider Electric rack powering options for high density](https://www.se.com/us/en/download/document/SPD_NRAN-5TDSPN_EN/)
- [ENERGY STAR guidance on intelligent PDUs](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/reduce-energy-losses-power-distribution-units-pdus)
- [Equinix colocation power limits and redundant circuit pairs](https://docs.equinix.com/colocation/about/colo-power/)
- [Equinix customer installation guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/)
