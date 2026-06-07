# Validation Summary: How to Use Pulumi with Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi (Go SDK v3)
- Pulumi AWS provider (SDK v6)
- Pulumi Kubernetes provider (SDK v4)
- Go (modules, testing)
- AWS (S3, EC2, VPC, IAM, EKS)
- Kubernetes (Deployments, Services)
- GitHub Actions (CI/CD pipeline)
- testify (Go testing assertions)

## Sources Consulted
- Pulumi Go SDK reference: https://www.pulumi.com/docs/iac/languages-sdks/go/
- Pulumi AWS v6 Go API docs: https://www.pulumi.com/registry/packages/aws/api-docs/
- Pulumi Kubernetes v4 Go API docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/
- Pulumi CLI reference: https://www.pulumi.com/docs/cli/
- Pulumi configuration / secrets docs: https://www.pulumi.com/docs/iac/concepts/config/
- Pulumi Component Resources docs: https://www.pulumi.com/docs/iac/concepts/resources/components/
- Pulumi unit testing docs (Go): https://www.pulumi.com/docs/iac/using-pulumi/testing/unit/
- Pulumi GitHub Actions: https://github.com/pulumi/actions
- AWS EKS supported Kubernetes versions: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html

## Issues Found
1. **Missing `"fmt"` import in EKS cluster example** — The code uses `fmt.Sprintf("node-policy-%d", i)` inside the loop that attaches node policies but the import block only included `eks`, `iam`, and `pulumi`. Added `"fmt"` to the import block so the example compiles.
2. **Missing `"fmt"` import in structured configuration example** — The code uses `fmt.Sprintf("Connecting to %s:%d", dbConfig.Host, dbConfig.Port)` inside `ctx.Log.Info`, but the import block did not include `"fmt"`. Added `"fmt"` to the import block.
3. **Misleading AMI ID comment** — The EC2 example used `Ami: pulumi.String("ami-0c55b159cbfafe1f0")` with the inline comment `// Amazon Linux 2`. That specific AMI ID is widely known from older Terraform tutorials as an Ubuntu 16.04 LTS image, not an Amazon Linux 2 image, and AMI IDs are region-scoped anyway. Updated the comment to make clear it is a placeholder and the reader should look up the correct latest Amazon Linux 2 AMI for their region. (The user-data script uses `yum`, which is appropriate for Amazon Linux, so the rest of the example remains internally consistent.)

## Review Notes
- The post intentionally uses the legacy `s3.Bucket` resource (with inline `BucketVersioningArgs`) rather than the newer `s3.BucketV2` + `s3.BucketVersioningV2` split that the AWS provider now recommends. The legacy type still exists and works in `pulumi-aws` v6, so the code is not broken, but a future revision could migrate to `BucketV2` and the separate sub-resources for long-term forward compatibility.
- In the `TestS3BucketHasVersioning` test, `versioning.Enabled` is `*bool` in the v6 SDK, so the literal `assert.True(t, versioning.Enabled)` snippet would not compile against today's SDK without dereferencing (e.g., `assert.True(t, versioning.Enabled != nil && *versioning.Enabled)`). The mock-based test pattern itself is correct (`pulumi.WithMocks`, `pulumi.RunErr`, `pulumi.MockResourceArgs`, etc.); left as-is since the example is illustrative and a full rewrite would extend beyond a technical-correctness fix.
- EKS version `1.29` is a valid AWS EKS Kubernetes version. EKS continually adds newer versions and deprecates older ones; readers running this in production should consult the AWS EKS supported versions page.
- `pulumi/actions@v5`, `actions/checkout@v4`, and `actions/setup-go@v5` are all current and correct at the time of review.
- All Pulumi CLI commands (`pulumi new`, `pulumi login`, `pulumi config set`, `pulumi stack init/select/ls`, `pulumi preview/up/refresh/destroy/import`, `pulumi stack export`) match the official CLI reference.
- Mermaid diagrams are syntactically valid.
