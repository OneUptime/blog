# Validation Summary: How to Fix Lambda source_code_hash Updating with Same Code

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- HashiCorp Archive Provider
- AWS Lambda
- Amazon S3
- Docker
- Bash and Info-ZIP

## Sources Consulted
- Terraform AWS Provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider `aws_s3_object` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- Terraform Archive Provider `archive_file` documentation: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- Terraform `base64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64sha256
- Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda .zip deployment package documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-zip.html
- AWS Lambda CreateFunction API documentation: https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html
- AWS Lambda FunctionConfiguration API documentation: https://docs.aws.amazon.com/lambda/latest/api/API_FunctionConfiguration.html
- Local Info-ZIP 3.0 `zip -h` and `zip -h2` command output

## Issues Found
- The `archive_file` examples did not set `output_file_mode`, which the current Archive Provider documents as the way to avoid cross-platform file mode differences changing archive checksums. Added `output_file_mode = "0666"` to the relevant examples.
- The `archive_file` excludes used patterns that might not exclude nested cache and metadata files reliably. Updated them to globstar patterns supported by the Archive Provider.
- The Node.js examples used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. Updated Node.js examples to `nodejs24.x`.
- The S3 object example used `etag = filemd5(...)`. Current AWS Provider docs recommend `source_hash` for update triggering when `etag` limitations such as KMS encryption or multipart behavior matter. Updated the example to `source_hash = filemd5(...)`.
- The content-based hash examples did not sort the `fileset` result or include filenames in the hash input. Updated them to sort matched files and include each filename with its content hash so ordering and renames do not create misleading results.
- The Docker build example attempted to create `/output/lambda.zip` during `docker build`, but the host volume is only mounted during `docker run`. Changed the packaging step to a container `CMD`, created `/output` at runtime, and installed `zip` in the image.
- The Docker-based Terraform example tried to build the ZIP with `null_resource` and then hash it with `filebase64sha256`. Terraform file functions are evaluated while planning and cannot wait for provisioners, so the ZIP must already exist before `terraform plan` or `terraform apply`. Replaced the example with an `aws_lambda_function` configuration that deploys the Docker-built ZIP directly.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The Terraform arguments and functions were checked against current official HashiCorp documentation, and shell ZIP flags were checked against local Info-ZIP help output.
