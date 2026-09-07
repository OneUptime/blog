# How to Compare Colocation Power Pricing Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Power, Metering, Cost Analysis, Capacity Planning

Description: Compare per-amp, metered-kWh, and flat-rate colocation power by converting every quote into capacity, energy, and contract cost.

---

Colocation power can be sold as reserved amps, measured energy, or a bundled flat rate. The cheapest model depends on both your peak requirement and the shape of your load, so normalize the offers before comparing prices.

## Separate capacity from energy

Capacity is an instantaneous limit, commonly expressed as amps, kW, or kVA. Energy is consumption over time in kWh. A quote can charge for one, the other, or both.

Convert an amp allocation to approximate real power only after identifying voltage, phase, permissible continuous loading, and true power factor:

```text
single-phase kW = volts x amps x true power factor / 1,000
balanced three-phase kW = sqrt(3) x line-to-line volts x amps x true power factor / 1,000
```

The same circuit has `kVA = kW / true power factor`. Do not assume that a quoted 20 A means 20 A of continuous usable load, or that an A/B pair provides twice one circuit's failover capacity. Ask the provider for the contractual kW or kVA draw cap, per-phase limits, circuit allowance, meter boundary, and alarm and enforcement thresholds.

## Understand each model

### Per-amp pricing

You pay for an allocated circuit or amperage, usually every month whether it is fully used or not. It is predictable and can suit steady, high-utilization loads. It can be wasteful when peak capacity is reserved for rare events.

Clarify whether the price covers one circuit or an A/B pair, whether both feeds are billed at their full rating, and whether measured overage is possible.

### Metered-kWh pricing

The provider measures energy delivered to a defined point and bills actual kWh, often with a separate capacity or cabinet charge. It can reward efficient or variable workloads, but exposes the bill to workload growth and rate changes.

Ask for meter location, interval, accuracy, access to raw readings, demand charges, utility pass-through, loss factor, minimum bill, and the treatment of redundant feeds. ENERGY STAR distinguishes instantaneous kW from energy accumulated in kWh, a distinction that should also appear in the contract. Do not apply a provider's published PUE as an energy-billing multiplier unless the contract explicitly defines that calculation.

### Flat-rate pricing

A fixed price bundles power up to a stated limit. It is simple only if the limit is explicit. Determine whether the boundary is breaker rating, continuous amps, kW, kVA, measured peak, or a thermal cap. Check what happens when the limit is exceeded and whether power is throttled, disconnected, or moved to another tier.

## Model the same workload

Build hourly or 15-minute load data if available. At minimum, estimate average kW, credible peak kW, monthly kWh, growth, and A/B failover demand.

```text
monthly energy = average kW x hours in billing month
```

A 4.0 kW average load over a 730-hour month consumes about 2,920 kWh. A 5.0 kW peak still determines the required capacity even though it does not determine the metered energy total.

For each quote with constant monthly charges and a single energy rate, calculate:

```text
annual cost = fixed monthly charges x 12
            + annual metered kWh x energy rate
            + annual demand or overage charges
            + annual adjustments
```

If charges or energy rates vary, sum the applicable fixed charges and each billing interval's kWh multiplied by its rate instead. Use the bidder's actual rates rather than market examples. Include installation, meter, PDU, redundant-circuit, and power-upgrade charges, plus taxes or levies that apply to your entity and location. Apply contractual annual escalators in the month they take effect. Keep currency and inflation assumptions consistent across bids.

## Run utilization and growth scenarios

Calculate at least three cases:

- base: current measured average and peak
- growth: approved hardware and workload forecast
- stress: credible failover or seasonal peak

For reserved power, show utilization as `average kW / paid usable kW`. For metered power, show the break-even average load where its total bill, including fixed, energy, and applicable demand or overage charges, equals the fixed alternative for the same period and load scenario. Sensitivity-test utility rates and power factor if either affects price.

Power cost is not the whole decision. Confirm that the cooling allocation supports the same design load, and include the cost and lead time of a later circuit upgrade. A slightly dearer scalable design can be cheaper than an emergency migration.

## Verify the bill after turn-up

Photograph or export opening meter readings, agree on the meter identifier, and compare the first invoice with rack PDU data. Reconcile units and periods rather than expecting the readings to match exactly across different measurement boundaries.

Track average load, monthly energy, peak load, paid capacity, and cost per delivered kWh. Review the model whenever hardware, tariffs, or redundancy changes.

## Conclusion

Convert every power quote into usable capacity, expected kWh, and total contract cost. Per-amp pricing favors predictable utilization, metered pricing follows consumption, and flat rate favors simplicity only when its technical boundary and overage behavior are clear.

## Official Documentation

- [ENERGY STAR Portfolio Manager glossary for IT energy and meter boundaries](https://portfoliomanager.energystar.gov/pm/glossary)
- [ENERGY STAR data center metering guidance](https://www.energystar.gov/ia/partners/prod_development/downloads/Data_Center_Metrics_Task_Force_Recommendations_V2.pdf)
- [US Department of Energy guidance on energy, demand, and fixed charges](https://www.energy.gov/cmei/femp/evaluating-your-utility-rate-options)
- [Schneider Electric single-phase and three-phase kVA formulas](https://www.se.com/us/en/faqs/FA101600/)
- [Schneider Electric guidance for calculating PUE](https://www.apc.com/us/en/download/document/SPD_SNIS-7E6LKL_EN/)
- [ENERGY STAR guidance for selecting a colocation facility](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/select-sustainable)
- [Equinix colocation draw-cap and circuit documentation](https://docs.equinix.com/colocation/about/colo-power/)
