# How to Calculate ROI for Ceph vs Commercial Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ROI, Commercial Storage, Cost Analysis, NetApp, Pure Storage

Description: Build a structured ROI model comparing Ceph against commercial storage vendors like NetApp and Pure Storage to justify or validate your storage investment.

---

## Why ROI Analysis Matters

Switching from commercial storage to Ceph - or justifying a Ceph investment to management - requires a quantified ROI model that accounts for all cost factors over a meaningful time horizon.

## Commercial Storage Baseline Costs

```bash
# Typical enterprise SAN/NAS pricing (estimates):
# NetApp AFF A400: ~$50,000-150,000 for 100 TB usable
# Pure Storage FlashArray: ~$60,000-200,000 for 100 TB usable
# Annual support contract: 15-20% of hardware cost
# Vendor lock-in: forced upgrades every 3-5 years

# 5-year commercial storage TCO for 200 TB usable:
# Hardware: $300,000
# Support (18% x 5 years): $270,000
# Total 5-year: $570,000
# Per TB per year: $570
```

## Ceph 5-Year TCO for Same Capacity

```bash
# Ceph hardware for 200 TB usable:
# 3x replication: 600 TB raw
# 50 x 12 TB HDDs = 50 drives (600 TB raw)
# 10 nodes x $10,000 each = $100,000 hardware

# 5-year operational costs:
# Staff (0.5 FTE @ $120k/year): $300,000
# Power + cooling: $18,000
# Network upgrades: $15,000
# Total 5-year: $433,000
# Per TB per year: $433
```

## ROI Calculation

```python
#!/usr/bin/env python3

# 5-year costs
commercial_tco = 570_000
ceph_tco = 433_000

# Savings
savings = commercial_tco - ceph_tco
roi_pct = (savings / ceph_tco) * 100

print(f"Commercial TCO: ${commercial_tco:,}")
print(f"Ceph TCO:       ${ceph_tco:,}")
print(f"Savings:        ${savings:,}")
print(f"ROI:            {roi_pct:.1f}%")

# Payback period
year1_delta = (570_000 - 433_000) / 5
print(f"Annual savings: ${year1_delta:,.0f}")
```

## Additional Ceph Advantages Not Captured in Direct Cost

```bash
# Scale-out without vendor lock-in: add commodity hardware
# No per-feature licensing: snapshots, replication, tiering included
# Open source: inspect and modify code
# Multi-protocol: block, file, object from same cluster
# No forced refresh cycles
```

## Risk-Adjusted ROI

Account for risks in the Ceph deployment:

```bash
# Risk adjustments:
# Staff turnover risk: +$50,000 (recruitment + training)
# Unplanned downtime (if less mature ops team): +$20,000
# Migration costs from existing storage: +$30,000

# Adjusted Ceph TCO: $433,000 + $100,000 = $533,000
# Risk-adjusted savings: $570,000 - $533,000 = $37,000
# Risk-adjusted ROI: 6.9%

# Still positive ROI, but factor in intangibles:
# - No vendor lock-in
# - Skills are transferable
# - Open source community support
```

## Building the Business Case Document

```yaml
executive_summary:
  current_state: "Commercial storage, 200 TB usable"
  proposed_state: "Ceph on commodity hardware"
  5_year_savings: "$137,000"
  roi: "31.6%"
  payback_period: "2.8 years"

investment_required:
  hardware: "$100,000"
  implementation: "$20,000"
  training: "$15,000"
  total: "$135,000"
```

## Summary

ROI for Ceph vs commercial storage is typically positive for deployments over 100 TB with a 3-5 year planning horizon. The key ROI drivers are eliminating vendor support contracts, avoiding forced refresh cycles, and amortizing staff costs across growing capacity. Risk adjustments for operational maturity are essential for an honest model.
