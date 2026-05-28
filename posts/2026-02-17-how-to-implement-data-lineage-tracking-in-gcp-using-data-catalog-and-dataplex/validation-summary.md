# Validation Summary: How to Implement Data Lineage Tracking in GCP Using Data Catalog and Dataplex

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Google Cloud
- Dataplex / Knowledge Catalog
- Data Lineage API
- BigQuery
- Dataflow
- Dataproc
- Cloud Data Fusion
- Google Cloud CLI
- Python client library for Data Lineage API

## Sources Consulted
- Google Cloud Dataplex data lineage overview: https://cloud.google.com/dataplex/docs/about-data-lineage
- Google Cloud use data lineage guide: https://docs.cloud.google.com/dataplex/docs/use-lineage
- Google Cloud Data Lineage API REST reference: https://docs.cloud.google.com/dataplex/docs/reference/data-lineage/rest
- Google Cloud Data Lineage API RPC reference: https://docs.cloud.google.com/dataplex/docs/reference/data-lineage/rpc/google.cloud.datacatalog.lineage.v1
- Google Cloud Python Data Lineage client reference: https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.services.lineage.LineageClient
- Google Cloud Python SearchLinksRequest reference: https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.types.SearchLinksRequest
- Google Cloud fully qualified names reference: https://cloud.google.com/dataplex/docs/fully-qualified-names
- Google Cloud Dataflow lineage guide: https://cloud.google.com/dataflow/docs/guides/lineage
- Google Cloud Data Catalog to Dataplex Universal Catalog transition guide: https://docs.cloud.google.com/dataplex/docs/transition-to-dataplex-catalog
- Google Cloud Dataplex deprecations: https://cloud.google.com/dataplex/docs/deprecations
- Google Cloud SDK Dataplex asset create reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/assets/create
- Google Cloud SDK Dataplex zone create reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/zones/create

## Issues Found
- The post described Data Catalog as the active storage and UI layer for lineage. Data Catalog is deprecated and shut down in favor of Dataplex Universal Catalog, which current Google Cloud docs now call Knowledge Catalog. Updated the title, tags, description, and related prose to use Dataplex / Knowledge Catalog and note the Data Catalog deprecation.
- The post stated automatic lineage happens without any configuration. Official docs require enabling the Data Lineage API, and some services have product-level or job-level controls. Updated the automatic lineage explanation and wrap-up.
- The service support list overstated BigQuery and Dataflow behavior. Updated BigQuery wording to match supported copy, Cloud Storage load, DDL, and DML operations, and noted Dataflow requires lineage to be enabled on the job.
- The `gcloud data-lineage search-links` command is not present in the current Google Cloud SDK reference. Replaced it with a REST `curl` call to the documented `projects.locations.searchLinks` endpoint.
- The custom lineage Python example used `datacatalog_lineage_v1.types.AttributeValue`, which is not the documented type for `Process.attributes`. Replaced it with `google.protobuf.struct_pb2.Value` and removed an unused `time` import.

## Review Notes
- The Python code blocks compile syntactically, but live API execution was not performed because this workspace has no `gcloud` installation or configured Google Cloud project credentials.
- The Dataplex lake, zone, and asset CLI examples match the current Google Cloud SDK reference format.
