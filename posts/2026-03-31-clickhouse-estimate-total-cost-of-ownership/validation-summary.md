# Validation Summary: How to Estimate Total Cost of Ownership for ClickHouse

## Status
validated

## Post Type
Guide / Framework article (TCO estimation for ClickHouse self-hosted vs managed)

## Technologies Covered
- ClickHouse (self-hosted)
- ClickHouse Cloud
- AWS EC2 (r6i.4xlarge)
- AWS EBS (gp3)
- ClickHouse `system.parts` table

## Sources Consulted
- ClickHouse Cloud pricing overview — https://clickhouse.com/docs/cloud/manage/billing/overview
- ClickHouse Cloud pricing page — https://clickhouse.com/pricing
- Quesma blog: ClickHouse Cloud Pricing Change in January 2025 — https://quesma.com/blog/clickhouse-pricing/
- AWS EC2 r6i instance type page — https://aws.amazon.com/ec2/instance-types/r6i/
- Vantage instance pricing for r6i.4xlarge — https://instances.vantage.sh/aws/ec2/r6i.4xlarge
- ClickHouse `system.parts` documentation — https://clickhouse.com/docs/operations/system-tables/parts

## Issues Found

1. **Incorrect ClickHouse Cloud compute pricing unit.** The post stated `$0.21 per GiB-hour (memory-based)`. ClickHouse Cloud actually bills per **compute unit** (1 unit = 8 GiB RAM + 2 vCPU), with per-unit-hour pricing of roughly `$0.2181` (Basic), `$0.2985` (Scale), and `$0.3903` (Enterprise). The stated `$0.21/GiB-hour` would imply ~$1.68 per compute-unit-hour, which is ~5–8× actual pricing.
   - **Fix:** Replaced with `~$0.2985 per compute-unit-hour (1 compute unit = 8 GiB RAM, 2 vCPU)` on the Scale tier, plus `~$25.30 per TB/month (~$0.0247/GB/month)` for storage.

2. **Incorrect math label in the cloud example.** The line `Compute: 96 * $0.21 * (12 * 30) = $7,257/month (full time)` labeled `12 * 30 = 360` hours as "full time", but full time would be `730` hours. The "40% utilization" step then multiplied that already-reduced number by 0.40, double-discounting.
   - **Fix:** Rewrote the example to compute a 24/7 baseline (`12 units * $0.2985 * 730 = $2,615`), then apply `40%` utilization via auto-suspend to arrive at `$1,046/month`, plus `$51/month` for 2 TB storage at the corrected rate.

3. **Comparison table updated for consistency.** Cloud compute was updated from `$2,903` to `$1,046`, storage from `$47` to `$51`, and total from `$2,950` to `$1,097` to reflect the corrected pricing.

4. **Summary narrative adjusted.** The original summary claimed "ClickHouse Cloud eliminates ops burden but costs more on compute", which no longer matches the corrected numbers (in the given example, Cloud is cheaper on compute thanks to auto-suspend). Reworded to: self-hosted can look cheaper on raw compute at high utilization, while Cloud's auto-suspend can lower effective compute cost for variable workloads.

Items that were already correct:
- `r6i.4xlarge`: 16 vCPU, 128 GiB RAM, ~$1.008/hour on-demand in us-east-1. `3 * $1.008 * 730 = $2,208/month` verified.
- EBS gp3 at `$0.08/GB/month` and the self-hosted storage math (`2048 * 1.5 * $0.08 ≈ $245/node`, `×3 nodes = $735`) verified.
- The `system.parts` SQL query is valid ClickHouse SQL and the `data_compressed_bytes` / `active` columns are correct.
- Data migration rough math (`1 TB at 500 MB/s ≈ 2000 s ≈ 33 min`) verified.

## Review Notes
- The 3-node, 6 TB self-hosted configuration is not strictly apples-to-apples with the 96 GiB / 2 TB Cloud example; a fairer comparison would size both workloads identically. Left alone since it was not a technical inaccuracy — only a modeling choice — and adjusting it would reshape the post beyond error correction.
- ClickHouse Cloud pricing varies by tier, region, and cloud provider. The corrected numbers assume Scale tier on AWS us-east-1; readers running Basic or Enterprise tiers or in other regions should recompute.
- r6i instances are a reasonable but not the only sensible choice for ClickHouse; the post could note that newer Graviton (`r7g`, `r8g`) or Intel (`r7i`) generations may offer better price/performance, but this is an editorial suggestion, not a correction.
