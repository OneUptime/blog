# How to Fix Terraform Module Source Not Found Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Modules

Description: Learn how to diagnose and fix Terraform module source not found errors, including registry issues, local path problems, and Git source misconfigurations.

---

If you have spent any real time working with Terraform, you have almost certainly hit the dreaded "module source not found" error. It typically shows up when you run `terraform init` and looks something like this:

```text
Error: Failed to download module

Could not download module "vpc" (main.tf:10) source code from
"git::https://github.com/myorg/terraform-modules.git//vpc":
error downloading 'https://github.com/myorg/terraform-modules.git':
/usr/bin/git exited with 128: fatal: repository not found
```

Or if you are working with the Terraform Registry:

```text
Error: Module not installed

Module "compute" is not yet installed. Run "terraform init" to install all
modules required by this configuration.
```

This article walks through the most common causes and their fixes.

## Understanding Module Sources

Terraform supports several module source types. Each one has its own set of pitfalls:

- **Local paths** - `./modules/vpc` or `../shared/networking`
- **Terraform Registry** - `hashicorp/consul/aws`
- **GitHub** - `github.com/hashicorp/example`
- **Generic Git** - `git::https://example.com/repo.git`
- **S3 buckets** - `s3::https://s3-eu-west-1.amazonaws.com/bucket/module.zip`
- **GCS buckets** - `gcs::https://www.googleapis.com/storage/v1/modules/module.zip`

The source type determines what can go wrong and how you fix it.

## Fix 1: Local Path Issues

Local path references are the simplest source type, but they break easily when you reorganize your project structure.

```hcl
# This expects the module to be at ./modules/vpc relative to the calling file
module "vpc" {
  source = "./modules/vpc"
}
```

Common mistakes include:

- Using an incorrect relative path after moving files around
- Forgetting that the path is relative to the file containing the module block, not your working directory
- Missing the leading `./` for local modules

To fix this, verify the path actually exists:

```bash
# Check from the directory containing your .tf file
ls -la ./modules/vpc
```

If you recently restructured your project, update all module source paths accordingly. A quick grep helps find them all:

```bash
grep -rn 'source.*=.*"\./\|source.*=.*"\.\.' *.tf
```

## Fix 2: Terraform Registry Source Format

Registry modules follow a specific naming convention: `<NAMESPACE>/<NAME>/<PROVIDER>`. Getting this wrong produces a not-found error.

```hcl
# Wrong - missing the provider portion
module "vpc" {
  source  = "terraform-aws-modules/vpc"
  version = "5.1.0"
}

# Correct - includes namespace/name/provider
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"
}
```

Also check that you have not made a typo in the module name. Go to [registry.terraform.io](https://registry.terraform.io) and search for the module to confirm the exact source string.

If you are using a private registry, make sure you have configured the credentials:

```hcl
# In your .terraformrc or terraform.rc file
credentials "app.terraform.io" {
  token = "your-api-token-here"
}
```

## Fix 3: Git Repository Access

When using Git-based sources, authentication failures often masquerade as "not found" errors. The Git CLI does not always distinguish between "this repo does not exist" and "you do not have permission."

```hcl
module "networking" {
  source = "git::https://github.com/myorg/terraform-modules.git//networking?ref=v1.2.0"
}
```

First, verify you can clone the repo manually:

```bash
git clone https://github.com/myorg/terraform-modules.git
```

If that fails, the issue is authentication. For HTTPS sources, configure a credential helper or use a personal access token:

```bash
# Use SSH instead of HTTPS
module "networking" {
  source = "git::git@github.com:myorg/terraform-modules.git//networking?ref=v1.2.0"
}
```

For SSH sources, confirm your SSH key is loaded:

```bash
ssh-add -l
# If empty, add your key
ssh-add ~/.ssh/id_rsa
```

And test connectivity:

```bash
ssh -T git@github.com
```

## Fix 4: Subdirectory References in Git Sources

The double-slash `//` syntax tells Terraform which subdirectory within a repository contains the module. Getting this wrong is a frequent source of errors.

```hcl
# Wrong - single slash does not specify a subdirectory
module "vpc" {
  source = "git::https://github.com/myorg/modules.git/networking/vpc"
}

# Correct - double slash separates the repo from the subdirectory path
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//networking/vpc"
}
```

Make sure the directory path after `//` actually exists in the repository at the ref you specified. A module that exists on `main` might not exist on an older tag.

## Fix 5: Version Tag and Branch References

If you pin a Git source to a specific ref, tag, or branch that does not exist, you will get a source-not-found error.

```hcl
module "vpc" {
  # This fails if tag v2.0.0 does not exist
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v2.0.0"
}
```

Verify the ref exists:

```bash
git ls-remote --tags https://github.com/myorg/modules.git | grep v2.0.0
```

If it was deleted or renamed, update your source reference.

## Fix 6: Network and Proxy Issues

Behind a corporate proxy or firewall, Terraform may fail to reach module sources. The error message usually points to a download failure rather than a clear network error.

Configure your proxy settings:

```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1
```

If your organization uses a custom CA certificate, tell Terraform about it:

```bash
export SSL_CERT_FILE=/path/to/ca-bundle.crt
```

## Fix 7: Stale Module Cache

Sometimes the module cache gets into a bad state. This happens after interrupted downloads or when switching between branches that use different module versions.

Clear the cache and re-initialize:

```bash
# Remove the .terraform directory
rm -rf .terraform
rm -f .terraform.lock.hcl

# Re-initialize
terraform init
```

If you want to force Terraform to re-download modules even if they are cached:

```bash
terraform init -upgrade
```

## Fix 8: S3 and GCS Bucket Sources

For cloud storage-based module sources, the issue is usually permissions or incorrect bucket paths.

```hcl
module "vpc" {
  source = "s3::https://s3-us-west-2.amazonaws.com/my-terraform-modules/vpc/module.zip"
}
```

Verify your AWS credentials are configured and you have `s3:GetObject` permission on the bucket. Test with the AWS CLI:

```bash
aws s3 ls s3://my-terraform-modules/vpc/
```

For GCS, ensure `gcloud` is authenticated and your service account has `storage.objects.get` on the bucket.

## Prevention Tips

A few practices help prevent module source errors from biting you in the first place:

1. **Pin versions explicitly** - Always use `version` for registry modules and `ref` for Git modules. Unpinned sources are a moving target.

2. **Use a module registry** - Whether it is the public Terraform Registry or a private one like Terraform Cloud, a registry gives you a stable source with clear versioning.

3. **Test module sources in CI** - Run `terraform init` in your CI pipeline so source issues are caught before they reach production workflows.

4. **Document module dependencies** - Keep a record of where your modules come from and what credentials are needed to access them.

5. **Use consistent source formats** - Pick one source type per project (registry, Git SSH, Git HTTPS) and stick with it.

## Wrapping Up

Module source not found errors are almost always caused by one of a few things: wrong paths, bad authentication, incorrect source format, or network problems. Work through them systematically, starting with the simplest explanation. Verify the source exists, confirm you have access, check the format matches what Terraform expects, and clear the cache if all else fails. Once you know what to look for, these errors become straightforward to resolve.
