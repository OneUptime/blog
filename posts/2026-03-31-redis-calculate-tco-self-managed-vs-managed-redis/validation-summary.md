# Validation Summary: How to Calculate TCO for Self-Managed vs Managed Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (self-managed on EC2 and managed via Amazon ElastiCache)
- AWS EC2 (r6g.large instance type)
- AWS EBS (gp3 storage)
- Amazon ElastiCache (cache.r7g.large)
- Bash scripting (`bc` for arithmetic)

## Sources Consulted
- AWS EC2 pricing for r6g.large instances (https://aws.amazon.com/ec2/pricing/on-demand/)
- AWS EBS gp3 pricing (https://aws.amazon.com/ebs/pricing/)
- Amazon ElastiCache pricing for cache.r7g.large (https://aws.amazon.com/elasticache/pricing/)
- AWS ElastiCache backup storage pricing documentation

## Issues Found

### 1. Side-by-side comparison table inconsistent with detailed breakdowns
**What was wrong:** The self-managed "Engineering (ops)" row in the table showed $425, but the detailed breakdown above it totals to $258 ($33 amortized setup + $200 patching + $25 amortized monitoring). This caused the self-managed total to show $720 instead of the correct $553 from the detailed breakdown.
**What was changed:** Fixed Engineering (ops) from $425 to $258, and self-managed total from $720 to $553.

### 2. Managed cost model missing incident response line
**What was wrong:** The table included a $50 incident response row for the managed service, but the detailed managed cost breakdown did not list this cost. The detailed total was $382 while the table showed $432.
**What was changed:** Added "Incident response (SLA-backed, avg 0.5 hrs/mo): $50/mo" to the managed cost detailed breakdown and updated its total from $382 to $432 to be consistent with the table.

### 3. Incorrect "40% cheaper" claim
**What was wrong:** The "40% cheaper" claim was based on the incorrect table figures ($720 vs $432). With corrected numbers ($553 vs $432), the managed service is approximately 22% cheaper, not 40%.
**What was changed:** Updated "40% cheaper" to "~22% cheaper".

### 4. Bash script missing monitoring cost
**What was wrong:** The TCO calculator bash script did not include the amortized monitoring setup cost ($25/mo) that was listed in the detailed self-managed breakdown. The script would have output $528 instead of $553.
**What was changed:** Added `MONITOR_HRS=3` and `AMORTIZED_MONITOR` calculation, and included it in the TOTAL computation.

## Review Notes
- The AWS pricing figures used are approximate and will vary by region and over time. The blog acknowledges this with "~" prefixes, which is appropriate.
- The `bc` utility performs integer division by default, so `4 * 100 / 12` yields 33 (not 33.33). This is acceptable for a rough TCO estimate and consistent with the "$33/mo" in the text.
- The r6g.large instance specs (2 vCPU, 16 GB) and cache.r7g.large specs (13.07 GB) are accurate.
- The engineering hourly rate of $100/hr is a simplifying assumption; in practice, fully-loaded engineering costs are often higher ($150-250/hr depending on location and seniority). The post uses this as a starting point, which is reasonable.
