# Validation Summary: How to Use SageMaker Data Wrangler for Feature Engineering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker Data Wrangler
- Amazon SageMaker Canvas
- Amazon SageMaker Studio Classic
- Amazon S3
- Amazon Athena
- Amazon Redshift
- Snowflake
- Databricks
- SageMaker Processing
- SageMaker Pipelines
- SageMaker Feature Store
- Python
- pandas
- NumPy
- boto3
- SageMaker Python SDK

## Sources Consulted
- AWS documentation: Prepare ML Data with Amazon SageMaker Data Wrangler - https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler.html
- AWS documentation: Import - Amazon SageMaker Data Wrangler - https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler-import.html
- AWS documentation: Transform Data - Amazon SageMaker Data Wrangler - https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler-transform.html
- AWS documentation: Get Insights On Data and Data Quality - https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler-data-insights.html
- AWS documentation: Export - Amazon SageMaker Data Wrangler - https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler-data-export.html
- AWS documentation: SageMaker ECR Paths for us-east-1 - https://docs.aws.amazon.com/sagemaker/latest/dg-ecr-paths/ecr-us-east-1.html
- AWS product page: Amazon SageMaker Data Wrangler - https://aws.amazon.com/sagemaker/data-wrangler

## Issues Found
- The post described Data Wrangler only as a tool inside SageMaker Studio. AWS documentation now states that Data Wrangler is integrated into SageMaker Canvas, while the documented Studio experience is SageMaker Studio Classic. Updated the wording to reflect the current product placement without removing Studio Classic context.
- The post said Data Wrangler generates Python, PySpark, or SQL code for production pipelines. AWS documents exports to Amazon S3, SageMaker Pipelines, SageMaker Feature Store, and Python Code, with custom transforms supporting PySpark, Python user-defined functions, pandas, and PySpark SQL. Updated the wording to avoid overstating generated code formats.
- Two pandas snippets were labeled as code Data Wrangler generates under the hood. They are valid illustrative pandas equivalents, but not guaranteed generated output from Data Wrangler. Reworded those comments as equivalent pandas logic.
- The processing job example hard-coded an incorrect `us-east-1` Data Wrangler container account ID. AWS ECR path documentation shows using `sagemaker.image_uris.retrieve(framework='data-wrangler', region='us-east-1')`, which resolves to the current regional Data Wrangler container URI. Updated the snippet to retrieve the image URI through the SageMaker Python SDK.
- The custom transforms section mentioned only Python or PySpark. AWS documents custom transformations using PySpark, Python user-defined functions, pandas, and PySpark SQL. Updated the sentence accordingly.

## Review Notes
All Python snippets were parsed with Python `ast` and are syntactically valid. Runtime execution was not performed because the local environment does not have pandas, boto3, or the SageMaker Python SDK installed, and the AWS examples require configured AWS credentials, IAM roles, and SageMaker resources.
