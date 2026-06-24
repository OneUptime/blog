# How to Update Documentation After Migrating to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Documentation, Migration, Best Practice, Technical Writing

Description: Learn how to systematically update your infrastructure documentation after migrating from Terraform to OpenTofu, covering README files, runbooks, wikis, and auto-generated docs.

## Introduction

After migrating your infrastructure to OpenTofu, updating documentation is essential to prevent team confusion and maintain accurate runbooks. This guide covers what to update, where to look, and how to automate documentation updates.

## Finding Documentation That Needs Updates

Search your repository for Terraform references:

```bash
# Find all files mentioning Terraform

grep -r "terraform" docs/ wiki/ README.md --include="*.md" -l

# Find command references
grep -rn "terraform init\|terraform plan\|terraform apply" docs/ --include="*.md"

# Find binary references
grep -rn "hashicorp/terraform\|terraform_version" . -l
```

## Updating Command References

The most common change is replacing command names:

| Before | After |
|--------|-------|
| `terraform init` | `tofu init` |
| `terraform plan` | `tofu plan` |
| `terraform apply` | `tofu apply` |
| `terraform destroy` | `tofu destroy` |
| `terraform fmt` | `tofu fmt` |
| `terraform validate` | `tofu validate` |
| `terraform state` | `tofu state` |

Use sed for bulk replacement in documentation:

```bash
# Preview changes
grep -rn "terraform " docs/ --include="*.md"

# Replace (backup first)
find docs/ -name "*.md" -exec sed -i.bak 's/terraform /tofu /g' {} \;

# Verify
grep -rn "tofu " docs/ --include="*.md" | head -20
```

## Updating Tool Version References

```bash
# Find Terraform version pins
grep -rn "terraform_version\|terraform v1\." . --include="*.md" --include="*.yml"
```

Update to OpenTofu versions:

```markdown
# Before
Required: Terraform >= 1.5.0

# After
Required: OpenTofu >= 1.6.0
```

## Updating Installation Instructions

Replace installation instructions in getting-started docs:

````markdown
## Installation

Install OpenTofu using the official installer:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh | sh
```

Or on macOS with Homebrew:

```bash
brew install opentofu
```
````

## Updating auto-generated Docs with terraform-docs

terraform-docs parses `.tf` files directly via the HCL library and does not invoke the `terraform` (or `tofu`) binary, so no `.terraform-docs.yml` changes are required for OpenTofu compatibility.

Regenerate all module docs:

```bash
find . -name "*.tf" -exec dirname {} \; | sort -u | while read dir; do
  terraform-docs markdown "$dir" > "$dir/README.md"
done
```

## Updating Wiki and Confluence Pages

Search your wiki for "Terraform" and systematically review each page. Focus on:
- Getting started guides
- Runbooks and incident response procedures
- Architecture decision records (ADRs)
- Onboarding documentation

## Conclusion

Documentation updates after migrating to OpenTofu are mostly mechanical - replacing `terraform` with `tofu` in command references. Automated search and replace handles the bulk of changes, while manual review ensures context-specific references like version numbers and installation instructions are correctly updated.
