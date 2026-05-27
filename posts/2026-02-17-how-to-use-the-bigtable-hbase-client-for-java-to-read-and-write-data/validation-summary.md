# Validation Summary: How to Use the Bigtable HBase Client for Java to Read and Write Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Bigtable
- Cloud Bigtable HBase client for Java
- Apache HBase Java API
- Java
- Maven
- Gradle

## Sources Consulted
- Google Cloud Bigtable client libraries documentation: https://docs.cloud.google.com/bigtable/docs/reference/libraries
- Google Cloud Bigtable and the HBase API documentation: https://docs.cloud.google.com/bigtable/docs/hbase-bigtable
- Google Cloud Bigtable app profiles documentation: https://docs.cloud.google.com/bigtable/docs/configuring-app-profiles
- Google Cloud Bigtable filters documentation: https://docs.cloud.google.com/bigtable/docs/filters
- Google Cloud Bigtable HBase differences documentation: https://docs.cloud.google.com/bigtable/docs/hbase-differences
- Apache HBase 2.5 SingleColumnValueFilter API documentation: https://hbase.apache.org/2.5/apidocs/org/apache/hadoop/hbase/filter/SingleColumnValueFilter.html
- Maven Central metadata for com.google.cloud.bigtable:bigtable-hbase-2.x: https://repo1.maven.org/maven2/com/google/cloud/bigtable/bigtable-hbase-2.x/maven-metadata.xml
- Maven Central POM for com.google.cloud.bigtable:bigtable-hbase-2.x 2.18.3: https://repo1.maven.org/maven2/com/google/cloud/bigtable/bigtable-hbase-2.x/2.18.3/bigtable-hbase-2.x-2.18.3.pom

## Issues Found
- The dependency example used `bigtable-hbase-2.x-hadoop` and an explicit `org.apache.hbase:hbase-client` dependency. Google Cloud's documentation recommends `bigtable-hbase-2.x` for standalone applications, with the Hadoop artifact reserved for Hadoop classpath-compatible environments. Updated Maven and Gradle examples to `com.google.cloud.bigtable:bigtable-hbase-2.x:2.18.3` and removed the separate HBase client dependency.
- The dependency version was outdated. Maven Central lists `2.18.3` as the current release, so the examples now use that version.
- The advanced configuration snippet labeled `google.bigtable.grpc.channel.count` as a timeout setting. This property configures the number of gRPC channels, so the comment was corrected.
- The scan examples used `Scan#setCaching` and `Scan#setBatch` as Bigtable performance tuning. Google Cloud documents that these calls are ignored by the Bigtable HBase client, so they were removed from the examples.
- The `SingleColumnValueFilter#setFilterIfMissing(true)` comment said it included rows where the column does not exist. Apache HBase documents the opposite behavior: when true, rows missing the column are skipped. The comment was corrected.
- The multiple-filter example used `BinaryPrefixComparator` with `SingleColumnValueFilter`. Bigtable documents comparator limitations for `SingleColumnValueFilter`, so the example now uses `RegexStringComparator` with the `EQUAL` operator for the page prefix match.
- The prefix scan example described `setRowPrefixFilter` as `PrefixFilter`. The code uses `Scan#setRowPrefixFilter`, so the comment was corrected to describe the API being used.
- The delete example used `Delete#addColumn(byte[], byte[])`, which Google Cloud documents as unsupported in the Bigtable HBase client. Changed it to `Delete#addColumns(byte[], byte[])` to delete all versions of the specified column.

## Review Notes
The examples remain illustrative and assume surrounding application types such as `UserEvent` and `keysToDelete`. Bigtable supports many HBase APIs, but the official differences page documents important behavior differences and filter limitations that developers should review for production migrations.
