# Validation Summary: How to Configure Storage Gateway Tape Gateway

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- AWS Storage Gateway Tape Gateway
- AWS CLI for Storage Gateway
- iSCSI initiators on Linux and Windows
- AWS CloudWatch metrics and alarms
- Amazon S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive
- Tape Gateway WORM and Tape Retention Lock

## Sources Consulted
- AWS Storage Gateway Tape Gateway: How Tape Gateway works: https://docs.aws.amazon.com/storagegateway/latest/tgw/StorageGatewayConcepts.html
- AWS Storage Gateway Tape Gateway requirements and supported iSCSI initiators: https://docs.aws.amazon.com/storagegateway/latest/tgw/Requirements.html
- AWS Storage Gateway quotas and local disk size recommendations: https://docs.aws.amazon.com/storagegateway/latest/tgw/resource-gateway-limits.html
- AWS CLI `storagegateway create-tapes`: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-tapes.html
- AWS CLI `storagegateway create-tape-with-barcode`: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-tape-with-barcode.html
- AWS CLI `storagegateway create-tape-pool`: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-tape-pool.html
- AWS Storage Gateway automatic tape creation API: https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_UpdateAutomaticTapeCreationPolicy.html
- AWS Storage Gateway automatic tape creation rules: https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_AutomaticTapeCreationRule.html
- AWS Storage Gateway automatic tape creation user guide: https://docs.aws.amazon.com/storagegateway/latest/tgw/CreateTapesAutomatically.html
- AWS Storage Gateway custom tape pools and retention lock: https://docs.aws.amazon.com/storagegateway/latest/tgw/CreatingCustomTapePool.html
- AWS Storage Gateway gateway metrics: https://docs.aws.amazon.com/storagegateway/latest/tgw/MonitoringGateways-common.html
- AWS Storage Gateway pricing: https://aws.amazon.com/storagegateway/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The post described Tape Gateway as emulating a media changer and tape drives without the current default count. Updated it to state that a Tape Gateway is preconfigured with one media changer and 10 tape drives.
- The cache sizing guidance said to size cache to the largest backup job. AWS documents minimums of 150 GiB for both Tape Gateway cache and upload buffer, with workload-based sizing beyond that. Updated the guidance to reflect the documented minimums and avoid an over-specific cache rule.
- The Linux iSCSI section said only that there are multiple tape drives. Updated it to match AWS's documented 11 VTL targets: one media changer and 10 tape drives.
- The automatic tape creation example included `create-tape-pool` as if that enabled automatic tape creation. That command creates a custom pool and was not used by the policy example. Removed it and kept the actual `update-automatic-tape-creation-policy` command.
- The automatic tape creation explanation said new tapes are created when tapes are in use or archived. AWS documents that available tapes in the import/export slot are counted, and imports from that slot reduce the available count. Updated the explanation.
- The WORM section treated a retention-locked custom tape pool as WORM protection. AWS distinguishes WORM tape creation from Tape Retention Lock on custom pools. Updated the wording to explain both and corrected the command comment.
- The CloudWatch alarm used `Average` for `CachePercentDirty`; AWS's gateway metric documentation recommends `Sum`. Updated the alarm example.
- The cost comparison implied that only S3 storage rates and the gateway VM cost apply. Updated it to include Tape Gateway virtual tape storage, data-written charges, and retrieval charges where applicable.

## Review Notes
The AWS CLI command names and primary Storage Gateway options used in the post are current in AWS CLI v2 documentation. Pricing remains region-specific and can change, so the post now frames prices as approximate US East examples rather than universal rates.
