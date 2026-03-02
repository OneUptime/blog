# How to Generate Provider Bindings in CDKTF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Provider, Code Generation, TypeScript

Description: Learn how to generate typed provider bindings in CDKTF for any Terraform provider, including pre-built providers and custom code generation workflows.

---

One of the things that makes CDKTF genuinely useful is that it generates typed bindings for every Terraform provider. Instead of guessing at attribute names and types, you get full autocompletion and compile-time checking. This guide covers how the binding generation process works, when to use pre-built providers versus generating your own, and how to troubleshoot common issues.

## How Provider Bindings Work

When you use Terraform with HCL, there is no compilation step. You write resource blocks and Terraform interprets them at runtime. CDKTF takes a different approach. It generates language-specific classes for every resource, data source, and provider configuration defined in a Terraform provider's schema.

These generated classes let you create resources as typed objects. For TypeScript, you get interfaces for every configuration block, so your IDE can tell you exactly which properties are available and which are required.

The generation process works like this:

1. CDKTF downloads the Terraform provider binary
2. It extracts the provider schema (all resources, data sources, and their attributes)
3. It generates typed classes in your target language
4. You import and use these classes in your code

## Pre-built Providers vs Generated Bindings

You have two options for getting provider bindings:

### Pre-built Providers

Pre-built providers are published as npm packages (for TypeScript/JavaScript) or PyPI packages (for Python). HashiCorp maintains pre-built packages for the most popular providers.

```bash
# Install pre-built providers directly
npm install @cdktf/provider-aws
npm install @cdktf/provider-azurerm
npm install @cdktf/provider-google
npm install @cdktf/provider-kubernetes
npm install @cdktf/provider-docker
npm install @cdktf/provider-null
npm install @cdktf/provider-random
```

Advantages of pre-built providers:
- Faster installation (no code generation step)
- Better IDE performance with pre-compiled type definitions
- Consistent versioning and releases
- Smaller project size

### Generated Bindings

For providers that do not have pre-built packages, or when you need a specific version, you generate bindings yourself.

```bash
# Generate bindings for a provider
cdktf provider add hashicorp/aws

# This first checks if a pre-built provider exists
# If not, it adds the provider to cdktf.json and generates bindings
```

## Configuring Provider Generation

The `cdktf.json` file controls which providers get generated. Here is a typical configuration:

```json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "projectId": "your-project-id",
  "terraformProviders": [
    "hashicorp/aws@~> 5.0",
    "hashicorp/random@~> 3.0",
    "datadog/datadog@~> 3.30"
  ],
  "terraformModules": [],
  "codeMakerOutput": ".gen",
  "context": {}
}
```

Key configuration options:

- **terraformProviders**: List of providers with version constraints
- **codeMakerOutput**: Directory where generated code goes (default: `.gen`)
- **language**: The target language (typescript, python, java, csharp, go)

## Running the Generation

After configuring `cdktf.json`, run the generation command:

```bash
# Generate all provider bindings defined in cdktf.json
cdktf get

# This downloads the provider schemas and generates typed classes
# Output goes to the directory specified in codeMakerOutput
```

The generated output structure looks like this:

```
.gen/
  providers/
    aws/
      provider/
        index.ts          # AwsProvider class
      instance/
        index.ts          # Instance resource class
      s3-bucket/
        index.ts          # S3Bucket resource class
      vpc/
        index.ts          # Vpc resource class
      ...
    random/
      provider/
        index.ts
      random-string/
        index.ts
      ...
```

## Importing Generated Bindings

Once generated, you import classes from the `.gen` directory:

```typescript
// Import from generated bindings
import { AwsProvider } from "./.gen/providers/aws/provider";
import { Instance } from "./.gen/providers/aws/instance";
import { S3Bucket } from "./.gen/providers/aws/s3-bucket";
import { Vpc } from "./.gen/providers/aws/vpc";

// Import from pre-built provider (different path)
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Instance } from "@cdktf/provider-aws/lib/instance";
```

Notice the import path difference between generated and pre-built providers. Generated bindings come from `./.gen/providers/`, while pre-built providers come from `@cdktf/provider-*/lib/`.

## Generating Bindings for Module Sources

You can also generate bindings for Terraform modules:

```json
{
  "terraformModules": [
    {
      "name": "vpc",
      "source": "terraform-aws-modules/vpc/aws",
      "version": "~> 5.0"
    },
    {
      "name": "eks",
      "source": "terraform-aws-modules/eks/aws",
      "version": "~> 19.0"
    }
  ]
}
```

After running `cdktf get`, you can use these modules as typed constructs:

```typescript
import { Vpc } from "./.gen/modules/vpc";

new Vpc(this, "main-vpc", {
  name: "production-vpc",
  cidr: "10.0.0.0/16",
  azs: ["us-east-1a", "us-east-1b", "us-east-1c"],
  privateSubnets: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"],
  publicSubnets: ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"],
  enableNatGateway: true,
  singleNatGateway: true,
});
```

## Updating Provider Bindings

When you need to update to a newer provider version:

```bash
# Update the version in cdktf.json, then regenerate
cdktf get

# Or update a pre-built provider
npm update @cdktf/provider-aws
```

For pre-built providers, check the compatibility matrix. The provider package version does not always match the underlying Terraform provider version.

## Handling Large Providers

The AWS provider is massive - it has thousands of resources. Generating bindings for it can take a while and produce a lot of code. Here are some tips:

```bash
# If generation is slow, consider using pre-built providers instead
npm install @cdktf/provider-aws

# If you must generate, increase Node memory limit
NODE_OPTIONS="--max-old-space-size=8192" cdktf get
```

For large projects with multiple providers, the generated code can be several hundred megabytes. Consider adding the generation output directory to `.gitignore` and regenerating during CI/CD:

```gitignore
# .gitignore
.gen/
node_modules/
cdktf.out/
```

## Troubleshooting Common Issues

### Generation Fails with Memory Error

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
cdktf get
```

### TypeScript Compilation Errors After Update

When a provider update introduces breaking changes:

```bash
# Remove generated code and regenerate
rm -rf .gen/
cdktf get

# Also clear the TypeScript build cache
rm -rf dist/ tsconfig.tsbuildinfo
```

### Missing Resources in Generated Bindings

If a resource you expect is not in the generated output, check the provider version. Newer resources require newer provider versions:

```json
{
  "terraformProviders": [
    "hashicorp/aws@~> 5.30"
  ]
}
```

### Conflicting Provider Versions

If two modules require different provider versions:

```json
{
  "terraformProviders": [
    "hashicorp/aws@>= 5.0, < 6.0"
  ]
}
```

## Best Practices

1. **Prefer pre-built providers** when available. They install faster, have better IDE integration, and produce smaller projects.

2. **Pin provider versions** in `cdktf.json`. Unpinned versions can lead to different code being generated on different machines.

3. **Regenerate after version changes**. Always run `cdktf get` after changing provider versions in `cdktf.json`.

4. **Add generated code to .gitignore**. The generated bindings can be reproduced from `cdktf.json`, so there is no need to check them into version control.

5. **Use the CDKTF CLI** for provider management. The `cdktf provider add` and `cdktf provider upgrade` commands handle the details for you.

Provider bindings are what make CDKTF a practical tool for real infrastructure work. The type safety alone prevents a whole class of configuration errors that are common in HCL. Whether you choose pre-built providers or generate your own, the end result is the same: typed, autocompletion-friendly classes for every Terraform resource.

For more on using specific providers, see our guides on [CDKTF with AWS](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-with-aws-provider/view), [CDKTF with Azure](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-with-azure-provider/view), and [CDKTF with GCP](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-with-gcp-provider/view).
