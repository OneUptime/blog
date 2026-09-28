# Validation Summary: How to Calculate EFS IA and Archive Costs for Small Files, 128-KiB Minimums, Transitions, and Retrievals

## Status
validated

## Post Type
Technical cost-estimation guide with a runnable Python example and billing formulas.

## Technologies Covered
- Amazon EFS Standard, Infrequent Access (IA), and Archive storage classes
- EFS lifecycle management and Elastic throughput
- Amazon CloudWatch StorageBytes metrics and AWS billing usage reports
- Python 3 arithmetic and built-in functions

## Sources Consulted
- [Amazon EFS pricing](https://aws.amazon.com/efs/pricing/) — storage, throughput, tiering, backup, and network cost categories.
- [EFS object and throughput metering](https://docs.aws.amazon.com/efs/latest/ug/metered-sizes.html) — file rounding, metadata, access increments, small-file eligibility, and throughput accounting.
- [EFS billing and usage reports](https://docs.aws.amazon.com/efs/latest/ug/billing-usage-reports-understand.html) — binary GB, GB-month calculation, tiering, and Archive early-deletion usage types.
- [EFS features and storage-class comparison](https://docs.aws.amazon.com/efs/latest/ug/features.html) — Archive eligibility and storage-duration requirements.
- [CloudWatch metrics for EFS](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html) — storage-class dimensions, small-file overhead, and metered totals.
- [Managing storage lifecycle](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html) — access timers, background transitions, metadata treatment, and return-to-Standard behavior.
- [Configuring lifecycle policies](https://docs.aws.amazon.com/efs/latest/ug/enable-lifecycle-management.html) — lifecycle settings and default transition behavior.
- [Python expressions](https://docs.python.org/3/reference/expressions.html) — multiplication, exponentiation, division, and floor division.
- [Python built-in functions](https://docs.python.org/3/library/functions.html) — max and print.
- [Author profile](https://github.com/nawazdhandala) — verified the attribution link resolves to the named author.

## Issues Found
1. The small-file estimate omitted a lifecycle-policy eligibility condition. Added the documented requirement that policies must have been updated on or after 12:00 PM PT on November 26, 2023 to tier files smaller than 128 KiB. Without this qualification, readers with older policies could assume their tiny files would transition.
2. The Archive discussion omitted its deployment requirements. Added that Archive is available for Regional file systems using Elastic throughput, so readers do not apply the Archive estimate to an unsupported configuration.

## Review Notes
- Executed the Python example extracted directly from README.md. It produced 3.814697265625 GiB of Standard content, 122.0703125 GiB of cold content, and 1.9073486328125 GiB of Standard metadata, matching the rounded figures in the post.
- Verified the 32-fold content expansion and the one-thirty-second storage-rate break-even comparison. These calculations intentionally exclude activity and retention charges.
- Confirmed the model is explicitly limited to positive-size, regular, non-sparse files; other object types require separate treatment.
- Confirmed hourly storage aggregation, the Archive 90-day minimum, and the absence of an IA minimum duration in the storage-class comparison.
- Confirmed IA and Archive overhead must be added to their respective content dimensions, while Total already includes small-file rounding.
- Confirmed lifecycle processing can lag eligibility, content reads can affect lifecycle behavior, and performance read discounting must not be applied indiscriminately to billing.
- All original external links resolved to the intended resources. No CLI commands, configuration examples, deprecated APIs, or pinned software versions appear in the post.
- No AWS resources were provisioned and no live billing experiment was performed. Access-cost projections remain dependent on actual requests, caching, transition settings, and current regional prices, as the post explains.
- Changes were limited to the two eligibility qualifications; the structure, formulas, and Python example were preserved.
