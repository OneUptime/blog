# Validation Summary: Why Doesn’t Geode Disk Usage Shrink After Entries Are Deleted? Oplogs and Compaction Explained

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Apache Geode persistent regions and disk stores
- Apache Geode oplogs (CRF, DRF, KRF, and IF files)
- Apache Geode online and offline disk-store compaction
- Apache Geode Java `DiskStore` API
- Apache Geode `gfsh` commands and disk-store configuration
- Filesystem disk-usage tools (`ls`, `du`, and `df`)

## Sources Consulted

- [Disk Store Operation Logs](https://geode.apache.org/docs/guide/latest/managing/disk_storage/operation_logs.html)
- [Running Compaction on Disk Store Log Files](https://geode.apache.org/docs/guide/latest/managing/disk_storage/compacting_disk_stores.html)
- [Designing and Configuring Disk Stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/using_disk_stores.html)
- [Disk Store Configuration Parameters](https://geode.apache.org/docs/guide/latest/managing/disk_storage/disk_store_configuration_params.html)
- [`create disk-store` command reference](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html)
- [`compact disk-store` and `compact offline-disk-store` command reference](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/compact.html)
- [`show metrics` command reference](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/show.html)
- [Geode Statistics List](https://geode.apache.org/docs/guide/latest/reference/statistics_list.html)
- [`DiskStore` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/DiskStore.html)
- [`DiskStoreFactory` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/DiskStoreFactory.html)
- [Persisting PDX Metadata to Disk](https://geode.apache.org/docs/guide/latest/developing/data_serialization/persist_pdx_metadata_to_disk.html)

## Issues Found
No technical issues found.

## Review Notes
The post is consistent with the current Apache Geode 2.0 API and the current official disk-storage guide. The commands use valid option names and value formats, and the stated defaults for automatic compaction, compaction threshold, forced compaction, maximum oplog size, and disk-usage thresholds are correct. The monitoring section mixes directly exposed Geode statistics with operationally derived rates; readers may need statistic archives or external monitoring to calculate some rates over time.
