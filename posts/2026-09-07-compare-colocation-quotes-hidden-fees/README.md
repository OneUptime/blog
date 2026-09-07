# How to Compare Colocation Quotes and Hidden Fees

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Procurement, Cost Analysis, Bandwidth, Power

Description: Normalize space, power, network, support, and contract charges so competing colocation quotes can be compared on a true annual cost.

---

A low cabinet price can become the expensive quote after power, cross-connects, remote hands, installation, and annual increases are included. Compare providers using the same technical scope and a full contract cash flow, not the monthly headline.

## Freeze one reference design

Give every bidder the same bill of requirements:

- location, cabinet count, usable rack units, depth, rail type, and maximum installed weight
- average and design power in kW, voltage, phase, connector, and A/B redundancy
- expected heat load and any unusually deep or high-airflow equipment
- internet commit, port speed, addressing, BGP, and denial-of-service requirements
- carrier cross-connect count, media, connector, and path-diversity requirement
- expected visits, shipments, remote-hands hours, and support response target
- contract term, desired start date, expansion option, and exit conditions

Separate a requirement from a preference. For example, two feeds are not useful redundancy unless each can carry the surviving load and their upstream paths meet the required failure model.

## Normalize the quote into a worksheet

Ask for both non-recurring charges, or NRCs, and monthly recurring charges, or MRCs. A useful comparison has one row per billable item:

| Cost item | Quantity and unit | NRC | MRC | Usage rate | Escalator |
| --- | --- | ---: | ---: | ---: | ---: |
| Cabinet or cage | 1 cabinet | | | | |
| A and B power | 2 circuits, stated rating | | | | |
| Internet access | commit and port | | | overage | |
| Carrier cross-connect | each circuit | | | | |
| Remote hands | included and excess hours | | | hourly | |
| Shipping and storage | pallet or package | | | daily | |

Confirm whether taxes, utility adjustments, regulatory recovery fees, insurance, and minimum purchase commitments are excluded. Equinix, for example, documents both one-time installation and monthly charges for standard cross-connects, so neither should be assumed to be inside the cabinet rate.

## Resolve power and bandwidth ambiguity

For power, record what is sold and what is measured. `20 A at 208 V` is not the same as 4.16 kW of usable IT load. Ask about continuous-load limits, power factor, redundant-feed billing, outlet metering, demand charges, kWh rates, and overage enforcement. Get the cabinet's allowed steady load in kW in writing.

For bandwidth, distinguish port speed from committed information rate. Capture the sampling interval, ingress-versus-egress rule, percentile calculation, commit, burst ceiling, and price above commit. Equinix's documented burst model samples every five minutes and bills overage from the monthly 95th percentile. Another provider may use transferred bytes or a hard policer, so the same traffic trace can produce a different bill.

## Price operational work

Remote hands often determines the real operating cost of a distant site. Ask what counts as billable time, the minimum increment, after-hours multiplier, cancellation rule, and difference between planned work and an outage ticket. Price representative tasks such as replacing a drive, moving four cables, taking a power reading, and escorting a vendor.

Also include:

- access badges, biometrics, parking, and escorted-access charges
- receiving, storage, pallet disposal, and outbound shipping
- patch cables, optics, private patch panels, and demarcation extensions
- cabinet setup, de-installation, early termination, and restoration fees
- mandatory insurance, deposits, and credit-card or currency charges

Provider documentation is valuable here. Equinix explicitly lists shipment, equipment, cabling, audit, and power-reading order types, some of which carry Smart Hands fees.

## Compare total contract value

Build a month-by-month model rather than multiplying today's MRC by the term:

```text
total contract value = all NRCs
                     + sum(monthly fixed charges after escalation)
                     + expected usage charges
                     + expected operational charges
                     + exit costs
```

Run base, growth, and failure cases. The growth case should add realistic power, cross-connect, and bandwidth demand. The failure case should include a burst month and emergency remote hands. Keep uncertainty visible instead of entering a zero for an unknown fee.

For each quote, calculate effective monthly cost and cost per usable kW. A cheap cabinet with only 3 kW of usable capacity should not be compared directly with a 6 kW cabinet.

## Put service assumptions into the order

Before signing, attach the final design and ask the provider to confirm demarcation points, circuit ratings, redundancy boundaries, delivery dates, maintenance notification, response times, service credits, and evidence needed for a claim. Note which documents control if the order form, service description, and master agreement disagree.

Do not treat a service credit as compensation for business loss. Verify liability limits, exclusions, chronic-failure termination rights, renewal, auto-renewal, price increases, equipment removal deadlines, and data-handling obligations.

## Conclusion

The comparable number is the risk-adjusted total contract value for an identical design. Normalize every unit, model usage and failure cases, price hands-on work, and convert sales assurances into contract language before choosing a provider.

## Official Documentation

- [Equinix cross-connect pricing and billing](https://docs.equinix.com/cross-connect/xc-pricing-billing-terms/)
- [Equinix Internet Access pricing and billing](https://docs.equinix.com/internet-access/eia-billing/)
- [Equinix Smart Hands order types](https://docs.equinix.com/smart-hands/ordering/order-types/)
- [Equinix customer installation guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/)
