# Validation Summary: How to Use the source Argument in Module Blocks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform module blocks
- Terraform module source addresses
- Terraform Registry and private registries
- Git and Mercurial module sources
- S3, GCS, and HTTP module archives
- Terraform CLI initialization

## Sources Consulted
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform variables reference: https://developer.hashicorp.com/terraform/language/block/variable
- Git URL documentation referenced by Terraform: https://git-scm.com/docs/git-clone
- AWS S3 virtual hosting documentation referenced by Terraform: https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html
- Google Cloud Storage object URL documentation referenced by Terraform: https://cloud.google.com/storage/docs/json_api/v1/objects

## Issues Found
- The post claimed it covered every supported source type but omitted Mercurial, which Terraform still documents as supported. I changed the wording to "common source types" and noted Mercurial in the high-level source type list.
- The post called `source` a required meta-argument. Terraform documents it as the required built-in `source` argument on a `module` block, so I corrected that phrasing.
- The post implied Terraform always downloads module code to `.terraform/modules/`. Local paths are installed from disk, and the stronger statement is only accurate for remote module installation, so I narrowed the wording.
- The Git section said Git sources use the `git::` prefix even though Terraform also documents GitHub and Bitbucket shorthand forms. I clarified that the prefix applies to generic Git sources.
- The S3 examples used a `us-east-1` regional endpoint and described S3 modules as zip-only. Terraform documents S3 bucket object URLs and supports several archive formats, so I updated the examples and archive wording.
- The GCS section described modules as zip-only. Terraform supports the same common archive formats, so I corrected the wording.
- The HTTP section omitted vanity URL behavior and `.netrc` authentication, and overstated archive detection from content type. I updated it to match Terraform's documented `X-Terraform-Get`, `terraform-get`, `.netrc`, and extension-based archive handling.
- The dynamic source section said variables and locals can never be used. Terraform v1.15 documents support for local values and input variables declared with `const = true`, so I updated the caveat and example comment.

## Review Notes
Terraform was not installed in the local environment, so I could not verify `terraform init -help` locally. The CLI command examples were reviewed against HashiCorp's current documentation instead.
