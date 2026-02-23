# How to Handle CDKTF Version Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, Version Management, Upgrades

Description: A practical guide to handling CDKTF version upgrades safely, covering breaking changes, provider compatibility, dependency updates, and testing strategies.

---

Upgrading CDKTF versions is one of those tasks that feels like it should be simple but can quickly spiral if you are not careful. CDKTF has been evolving rapidly, and major version bumps often include breaking changes to APIs, generated provider bindings, and the synthesis process. This guide gives you a battle-tested approach to handling upgrades without breaking your infrastructure.

## Understanding CDKTF Versioning

CDKTF follows semantic versioning. A version like 0.20.x means the project is still in pre-1.0 territory, where even minor version bumps can include breaking changes. Once CDKTF hits 1.0, the versioning rules will be stricter.

The key components you need to track are:

- `cdktf` - The core library
- `cdktf-cli` - The command-line tool
- `@cdktf/provider-*` - Pre-built provider bindings
- `constructs` - The constructs library (shared with AWS CDK and cdk8s)

These packages are versioned independently, which means you need to check compatibility between them.

## Step 1: Check Your Current Versions

Before upgrading anything, document what you are running:

```bash
# Check CDKTF CLI version
cdktf --version

# Check installed packages
npm list cdktf cdktf-cli constructs @cdktf/provider-aws 2>/dev/null

# Or if you are using a lock file
cat package-lock.json | grep -A1 '"cdktf"'
```

Record these versions. If the upgrade goes sideways, you will want to revert to exactly this state.

## Step 2: Read the Changelog

This step is not optional. Every CDKTF release has a changelog on GitHub that lists breaking changes, new features, and bug fixes.

```bash
# Check the CDKTF releases page
# https://github.com/hashicorp/terraform-cdk/releases

# Or use the CLI to check for updates
npm outdated cdktf cdktf-cli
```

Look specifically for:

- **Breaking changes** - API removals, renamed methods, changed behavior
- **Deprecated features** - Things that still work but will be removed later
- **New requirements** - Minimum Node.js version, minimum Terraform version, etc.

## Step 3: Create a Branch and Backup State

Never upgrade on your main branch. Create a feature branch and back up your state file:

```bash
# Create an upgrade branch
git checkout -b cdktf-upgrade-0.21

# Backup Terraform state (if using local state)
cp terraform.tfstate terraform.tfstate.backup

# If using remote state, take a snapshot
# Most backends (S3, Azure, GCS) support versioning
```

## Step 4: Upgrade Dependencies

Upgrade in the right order. Start with the constructs library, then cdktf core, then the CLI, and finally the provider packages:

```bash
# Upgrade core dependencies
npm install constructs@latest cdktf@latest

# Upgrade CLI
npm install -D cdktf-cli@latest

# Upgrade provider packages
npm install @cdktf/provider-aws@latest

# Or upgrade everything at once (riskier)
npx npm-check-updates -u '/cdktf|constructs/'
npm install
```

For Python projects:

```bash
# Upgrade pip packages
pip install --upgrade cdktf cdktf-cli-python

# If using requirements.txt
pip install --upgrade -r requirements.txt
```

## Step 5: Fix Compilation Errors

After upgrading, try to compile your project:

```bash
# TypeScript
npx tsc --noEmit

# Python
python -c "from main import *"
```

Common breaking changes and their fixes:

### Renamed Classes

Provider bindings sometimes rename classes between versions:

```typescript
// Before (old version)
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";

// After (new version - example of a potential rename)
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
// Check the provider changelog for actual renames
```

### Changed Constructor Signatures

```typescript
// Before
new S3Bucket(this, "bucket", {
  acl: "private",  // acl might be removed in newer provider versions
});

// After
new S3Bucket(this, "bucket", {});
// Use S3BucketAcl resource separately
new S3BucketAcl(this, "bucket-acl", {
  bucket: bucket.id,
  acl: "private",
});
```

### Changed Property Types

Properties that were strings might become objects, or lists might become sets:

```typescript
// Before
new SecurityGroup(this, "sg", {
  ingress: [{
    fromPort: 80,
    toPort: 80,
    protocol: "tcp",
    cidrBlocks: ["0.0.0.0/0"],
  }],
});

// After - ingress might need to be defined as separate rules
new SecurityGroupRule(this, "sg-rule", {
  securityGroupId: sg.id,
  type: "ingress",
  fromPort: 80,
  toPort: 80,
  protocol: "tcp",
  cidrBlocks: ["0.0.0.0/0"],
});
```

## Step 6: Run Synthesis

Once the code compiles, run synthesis to generate the Terraform JSON:

```bash
# Synthesize
cdktf synth

# Check for differences in generated output
diff -r cdktf.out.backup/ cdktf.out/
```

If you saved the previous synthesis output, compare the two versions. Look for:

- Resources being added or removed unexpectedly
- Changed resource configurations
- Modified provider blocks

## Step 7: Run Terraform Plan

The most important validation step is running a plan against your actual infrastructure:

```bash
# Deploy using CDKTF (plan only)
cdktf diff

# Or use Terraform directly
cd cdktf.out/stacks/my-stack
terraform plan
```

You want to see either "No changes" or only expected changes. If the plan shows resources being destroyed and recreated, investigate before applying.

## Step 8: Update Tests

If you have unit tests for your constructs, they may need updating:

```typescript
// Tests might break if assertion APIs changed
import { Testing } from "cdktf";

describe("After upgrade", () => {
  it("still creates expected resources", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test");
    const synth = Testing.synth(stack);

    // Check that synthesis still produces valid output
    expect(synth).toBeDefined();

    // Verify critical resources exist
    expect(synth).toHaveResource("aws_s3_bucket");
    expect(synth).toHaveResource("aws_instance");
  });
});
```

```bash
# Run tests
npm test
```

## Step 9: Apply to a Non-Production Environment

Before touching production, apply the upgraded code to a staging or development environment:

```bash
# Deploy to staging
cdktf deploy staging-stack

# Verify the deployment
# Check your monitoring, run integration tests, etc.
```

## Automating Version Checks

Set up automated dependency checking to catch needed upgrades early:

```yaml
# .github/workflows/dependency-check.yml
name: Check CDKTF Updates
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx npm-check-updates '/cdktf|constructs/' --target minor
      - name: Create issue if updates available
        run: |
          UPDATES=$(npx npm-check-updates '/cdktf|constructs/')
          if [ -n "$UPDATES" ]; then
            gh issue create \
              --title "CDKTF dependency updates available" \
              --body "$UPDATES"
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Rollback Strategy

If things go wrong after applying the upgrade, here is how to roll back:

```bash
# Revert to the previous branch
git checkout main

# If state was modified, restore the backup
cp terraform.tfstate.backup terraform.tfstate

# Reinstall old dependencies
npm ci

# Re-synthesize and apply
cdktf synth
cdktf deploy
```

## Tips for Smoother Upgrades

**Upgrade frequently in small steps.** Jumping from 0.15 to 0.21 is much harder than upgrading one minor version at a time. Each small upgrade is easier to debug.

**Keep your CDKTF CLI and library versions in sync.** Mismatched versions cause subtle and confusing errors.

**Follow the CDKTF GitHub repository.** Watching issues and discussions gives you early warning about breaking changes before they land in releases.

**Write integration tests that run `cdktf diff` against real infrastructure.** Unit tests catch API breaks, but integration tests catch behavioral changes.

CDKTF version upgrades do not have to be painful if you approach them methodically. The key is testing at every step and never applying to production without a clean plan.

For related content, see our guide on [How to Migrate from CDKTF to Standard Terraform](https://oneuptime.com/blog/post/2026-02-23-migrate-from-cdktf-to-standard-terraform/view).
