# Validation Summary: How to Create Azure Stream Analytics in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Stream Analytics
- Azure Event Hubs
- Azure Blob Storage
- Azure SQL Database
- Stream Analytics Query Language

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_stream_analytics_job`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/stream_analytics_job.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_stream_analytics_stream_input_eventhub`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/stream_analytics_stream_input_eventhub.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_stream_analytics_reference_input_blob`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/stream_analytics_reference_input_blob.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_stream_analytics_output_blob`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/stream_analytics_output_blob.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_stream_analytics_output_eventhub`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/stream_analytics_output_eventhub.html.markdown
- Microsoft Learn, Stream Analytics input metadata and Event Hubs input behavior: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-define-inputs
- Microsoft Learn, `GetMetadataPropertyValue` metadata properties: https://learn.microsoft.com/en-us/stream-analytics-query/getmetadatapropertyvalue
- Microsoft Learn, Stream Analytics JOIN syntax: https://learn.microsoft.com/en-us/stream-analytics-query/join-azure-stream-analytics
- Microsoft Learn, Stream Analytics streaming unit guidance: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-streaming-unit-consumption
- Microsoft Learn, Stream Analytics `INTO` examples for multiple outputs: https://learn.microsoft.com/en-us/stream-analytics-query/into-azure-stream-analytics

## Issues Found
- The initial Stream Analytics query used `IoTHub.ConnectionDeviceId` while the configured input is an Event Hub input. Changed the query to use the payload `DeviceId` field, matching the later advanced query and avoiding unsupported IoT Hub metadata access for this input configuration.
- The streaming unit comment listed only values up to 48 and claimed each SU provides roughly 1 MB/s. Updated it to the AzureRM-supported values and replaced the fixed throughput claim with Microsoft’s compute/memory-based guidance.
- The Blob output used `Parquet` serialization without `batch_max_wait_time` and `batch_min_rows`, which AzureRM requires for Parquet output. Added both arguments.
- The advanced query contained two `SELECT INTO` statements without a clear separator. Added a semicolon after the first statement to align with Stream Analytics multi-output examples.

## Review Notes
The post pins AzureRM `~> 3.80`, so the examples were validated against the 3.80 provider documentation. A future modernization pass could update the article for AzureRM 4.x, where some surrounding provider and storage container configuration patterns have changed.
