# How to Calculate Colocation Power from Real Server Draw

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Power, Capacity Planning, Server Hardware, Metering

Description: Convert measured server watts into a defensible rack power requirement with peak demand, growth, power factor, and A/B failover included.

---

A pair of 1,600 W power supplies does not make a server a 3,200 W load. Power-supply ratings describe conversion capacity, and redundant supplies may share one server load. A colocation design should start with measured input power under representative work.

## Define the measurement boundary

Measure AC input as close to the equipment as practical. Outlet-metered rack PDUs are ideal because they include power-supply losses. A server's baseboard management controller can provide useful watts, but first compare it with a trusted PDU or portable power analyzer.

Record at least:

- real power in watts, not only volts and amps
- apparent power in VA and true power factor when available
- timestamp, server identity, workload state, and active PSU count
- both A and B outlets for dual-corded devices
- switches, console servers, PDU controllers, and other rack loads

ENERGY STAR notes that server power meters are commonly exposed through the power supply or baseboard management controller. Retain raw time-series data rather than copying one dashboard value.

## Exercise real workload states

Collect normal production data across busy periods, deployments, backups, batch windows, and failover tests. For new hardware, run a workload that represents the intended CPU, memory, disk, GPU, and network mix. Synthetic CPU load alone can miss drive spin-up, accelerator, or fan demand.

Capture four values per device:

1. idle draw
2. typical busy draw
3. highest credible sustained draw
4. short observed peak

Do not sum unrelated device peaks blindly, but do not assume diversity without evidence. Correlate timestamps to find the rack's measured aggregate peak. Then test a planned worst case, such as service recovery plus a backup job.

## Turn watts into a design load

Start with the greater of the observed aggregate peak and the modeled credible peak. Add only explicit allowances:

```text
design real power = credible rack peak
                  + approved growth
                  + fixed rack infrastructure not already included in the peak
```

Suppose 12 servers and two switches reach 3.6 kW at the rack input. Planned additions need 0.45 kW and fixed management equipment not included in that measurement needs 0.15 kW:

```text
design real power = 3.60 + 0.45 + 0.15 = 4.20 kW
```

Convert real power to current using the actual service voltage and measured or conservative true power factor. For nonlinear server loads, do not substitute power-supply efficiency or displacement power factor for the meter's real-power-to-apparent-power ratio:

```text
single-phase current = watts / (volts x true power factor)
balanced three-phase current = watts / (sqrt(3) x line-to-line volts x true power factor)
```

At 208 V single phase and a 0.95 true power factor, 4.20 kW is about 21.3 A. Confirm whether the provider limits and bills in kW, kVA, amps, or more than one of them. `kVA = kW / true power factor`, so this design is approximately 4.42 kVA. For three-phase service, also verify phase balance and each phase's current limit.

## Model redundant-feed failure

With dual-corded equipment, measure the distribution in normal operation and then remove one feed during an approved test. Some servers split load evenly; others prefer one supply. When A fails, B must accept the entire protected load without exceeding the circuit, rack PDU, connector, or upstream allowance.

Do not request two half-sized circuits because the normal display shows half the current on each. For an A/B design where either feed must survive, each feed is sized for the failover design load. The pair can also have a contractual draw cap that is not the sum of both circuit ratings. Also verify transfer behavior for single-corded equipment connected through an automatic transfer switch.

## Add electrical and thermal constraints

The circuit rating is not automatically its permissible continuous current. In the United States, a load whose maximum current is expected for three hours or more is generally treated as continuous. For an all-continuous load on a standard-rated assembly, sizing at 125 percent is equivalent to limiting the load to 80 percent of the rating. Mixed loads use noncontinuous current plus 125 percent of continuous current, and a 100-percent-rated application requires the complete listed assembly and its installation conditions, not merely a breaker with the same nameplate current. The adopted code edition, authority having jurisdiction, provider rules, and facility engineer determine the actual limit.

Every watt consumed by IT equipment becomes roughly a watt of heat in the room. Use the provider's approved rack cooling capacity as a separate limit. A 4.2 kW electrical design cannot be deployed in a position approved for only 3 kW of heat removal.

## Validate after installation

Before production cutover:

- compare each device reading with the inventory
- run the highest credible workload
- fail A, restore A and verify redundancy, then fail B and restore B, while watching both PDU and server telemetry
- verify alarm thresholds below the enforced limit
- retain a 24-hour baseline and review it after workload changes

Use the nameplate only as a safety boundary or a fallback when no measurement is possible. Replace assumptions with measured data as soon as hardware is installed.

## Conclusion

Measure AC input at the rack, build a timestamp-correlated peak, add explicit growth, convert with the real voltage and power factor, and size each redundant feed for the surviving load. That produces a power request tied to the workload rather than an inflated PSU total.

## Official Documentation

- [ENERGY STAR server power management and metering](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/utilize-built-server-power-management-features)
- [Schneider Electric rack powering options for high density](https://www.se.com/us/en/download/document/SPD_NRAN-5TDSPN_EN/)
- [ENERGY STAR guidance on intelligent PDUs](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/reduce-energy-losses-power-distribution-units-pdus)
- [Schneider Electric explanation of standard and 100-percent-rated breakers](https://www.se.com/us/en/faqs/FA104355/)
- [Equinix colocation power limits and regional circuit allowances](https://docs.equinix.com/colocation/about/colo-power/)
- [Equinix customer installation guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/)
