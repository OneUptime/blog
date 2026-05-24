# Validation Summary: How to Create FSx File Systems in Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (HCL)
- AWS Provider (hashicorp/aws ~> 5.0)
- Amazon FSx for Windows File Server
- Amazon FSx for Lustre
- Amazon FSx for NetApp ONTAP
- Amazon FSx for OpenZFS
- AWS VPC / Security Groups
- AWS Managed Microsoft AD

## Sources Consulted
- [AWS FSx for Lustre — Security group access](https://docs.aws.amazon.com/fsx/latest/LustreGuide/limit-access-security-groups.html)
- [AWS FSx for OpenZFS — Modifying throughput capacity](https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/managing-throughput-capacity.html)
- [AWS FSx for OpenZFS — Performance](https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/performance.html)
- [AWS FSx for Windows — Managing DNS aliases](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/managing-dns-aliases.html)
- [Terraform Registry — aws_fsx_windows_file_system](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_windows_file_system)
- [Terraform Registry — aws_fsx_lustre_file_system](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_lustre_file_system)
- [Terraform Registry — aws_fsx_ontap_file_system](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_ontap_file_system)
- [Terraform Registry — aws_fsx_openzfs_file_system](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_openzfs_file_system)
- [Terraform Registry — aws_fsx_ontap_volume](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_ontap_volume)
- [Terraform Registry — aws_fsx_openzfs_volume](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_openzfs_volume)

## Issues Found

1. **Invalid OpenZFS `throughput_capacity` value for SINGLE_AZ_1.** The post used `throughput_capacity = 160` with `deployment_type = "SINGLE_AZ_1"`. Per AWS docs, valid SINGLE_AZ_1 values are 64, 128, 256, 512, 1024, 2048, 3072, or 4096 MB/s; 160 is only valid for SINGLE_AZ_2/MULTI_AZ. Changed value to `128` and added an inline comment listing valid values. This would have caused a hard validation failure at apply time.

2. **Incorrect Lustre security group port range.** The post used TCP port range `1021-1023` for Lustre inter-node traffic. Current AWS documentation specifies `1018-1023` (the inbound rules table in the Lustre security group guide explicitly lists 1018-1023). Updated the rule to use `1018-1023` so the security group permits all traffic the Lustre client and file servers expect.

3. **Misleading comment on the `aliases` attribute.** The comment above `aliases = ["fsx.example.com"]` said "Enable data deduplication to save storage", but `aliases` configures DNS aliases for the file system and has nothing to do with deduplication. Replaced with an accurate one-line description.

## Review Notes
- `aws_fsx_ontap_volume.size_in_megabytes` is still the current required attribute in the AWS provider 5.x. A newer `size_in_bytes` field exists in some recent provider versions but `size_in_megabytes` remains valid. No change needed.
- Lustre `storage_capacity = 2400` with `deployment_type = "PERSISTENT_2"` is valid (PERSISTENT_2 SSD supports 1200 GiB minimum with 2400 GiB increments after that; 1200 and 2400 are both accepted). The inline comment mentions SCRATCH_2/PERSISTENT_1 increments but is not technically incorrect — left as-is since the example would still apply cleanly.
- ONTAP `tiering_policy.cooling_period = 31` is within the valid range (2–183 days for AUTO/SNAPSHOT_ONLY policies).
- Windows `weekly_maintenance_start_time = "7:01:00"` uses the correct `d:HH:MM` format (day-of-week 1–7, then UTC time).
- ONTAP `endpoint_ip_address_range = "198.19.255.0/24"` is within the AWS-recommended non-routable 198.19.0.0/16 range used as the default by FSx.
- `var.data_bucket` is declared but never referenced inside the Lustre block — harmless since PERSISTENT_2 uses `aws_fsx_data_repository_association` (correctly noted in the post's comment) rather than `import_path`/`export_path`. Could be removed in a future cleanup but is not technically wrong.
