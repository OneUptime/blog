# Validation Summary: How to Use IoT Analytics for IoT Data Processing

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- AWS IoT Analytics
- AWS IoT Core rules
- AWS CLI
- AWS Lambda
- Amazon S3
- Apache Parquet
- Amazon QuickSight
- Jupyter notebooks
- Python boto3

## Sources Consulted
- AWS IoT Analytics end of support documentation: https://docs.aws.amazon.com/iotanalytics/latest/userguide/iotanalytics-end-of-support.html
- AWS IoT Analytics API Reference: https://docs.aws.amazon.com/iotanalytics/latest/APIReference/Welcome.html
- AWS IoT Core IotAnalyticsAction API Reference: https://docs.aws.amazon.com/iot/latest/apireference/API_IotAnalyticsAction.html
- AWS IoT Analytics datastore file format documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-iotanalytics-datastore-fileformatconfiguration.html
- AWS IoT Analytics DeviceRegistryEnrich documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-iotanalytics-pipeline-deviceregistryenrich.html

## Issues Found
- The post is dated February 12, 2026 and presents AWS IoT Analytics as a service readers can use to create new channels, pipelines, data stores, datasets, notebook workflows, and reprocessing jobs. Official AWS documentation states that AWS ended support for AWS IoT Analytics effective December 15, 2025, and that after that date customers can no longer access the AWS IoT Analytics console or resources.
- Because the core service covered by the tutorial was retired before the post date, the guide is not technically relevant as a current implementation article. I did not patch individual commands because the main corrective action would be replacing the article with a migration-oriented guide using supported AWS services.

## Review Notes
Several individual concepts in the article match historical IoT Analytics concepts, such as channels, pipelines, data stores, datasets, IoT Core rule delivery, Parquet datastore format, and pipeline enrichment activities. However, those details do not make the post valid for publication as a 2026 how-to guide because the service had already reached end of support.
