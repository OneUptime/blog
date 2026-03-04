# How to Configure Content Views and Lifecycle Environments in Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Content Views, Lifecycle, Patch Management

Description: Set up content views and lifecycle environments in Red Hat Satellite to control which packages and errata are available to RHEL hosts at each stage of your release pipeline.

---

Content Views and Lifecycle Environments in Red Hat Satellite give you precise control over which software versions reach your RHEL hosts. Content Views filter and snapshot repository content, while Lifecycle Environments define promotion stages like Development, QA, and Production.

## Create Lifecycle Environments

Lifecycle environments form a promotion path. Content moves through them sequentially:

```bash
# Create the Development environment (parent is Library)
hammer lifecycle-environment create \
    --name "Development" \
    --prior "Library" \
    --organization "MyOrg"

# Create QA (parent is Development)
hammer lifecycle-environment create \
    --name "QA" \
    --prior "Development" \
    --organization "MyOrg"

# Create Production (parent is QA)
hammer lifecycle-environment create \
    --name "Production" \
    --prior "QA" \
    --organization "MyOrg"

# List the lifecycle path
hammer lifecycle-environment paths --organization "MyOrg"
```

## Create a Content View

A Content View selects which repositories and filters to include:

```bash
# Create a content view
hammer content-view create \
    --name "RHEL9-Base" \
    --description "RHEL 9 base content" \
    --organization "MyOrg"

# Add repositories to the content view
hammer content-view add-repository \
    --name "RHEL9-Base" \
    --repository "Red Hat Enterprise Linux 9 for x86_64 - BaseOS RPMs 9" \
    --product "Red Hat Enterprise Linux for x86_64" \
    --organization "MyOrg"

hammer content-view add-repository \
    --name "RHEL9-Base" \
    --repository "Red Hat Enterprise Linux 9 for x86_64 - AppStream RPMs 9" \
    --product "Red Hat Enterprise Linux for x86_64" \
    --organization "MyOrg"
```

## Add Content Filters

Filters let you include or exclude specific packages and errata:

```bash
# Create an erratum date filter (only include errata before a cutoff)
hammer content-view filter create \
    --name "Errata-Cutoff" \
    --type erratum \
    --inclusion false \
    --content-view "RHEL9-Base" \
    --organization "MyOrg"

hammer content-view filter rule create \
    --content-view-filter "Errata-Cutoff" \
    --content-view "RHEL9-Base" \
    --organization "MyOrg" \
    --end-date "2026-03-01" \
    --types security,bugfix,enhancement

# Create a package exclusion filter
hammer content-view filter create \
    --name "Exclude-Kernel" \
    --type rpm \
    --inclusion false \
    --content-view "RHEL9-Base" \
    --organization "MyOrg"

hammer content-view filter rule create \
    --content-view-filter "Exclude-Kernel" \
    --content-view "RHEL9-Base" \
    --organization "MyOrg" \
    --name "kernel*"
```

## Publish the Content View

```bash
# Publish a new version
hammer content-view publish \
    --name "RHEL9-Base" \
    --organization "MyOrg" \
    --description "Initial publish"

# List versions
hammer content-view version list \
    --content-view "RHEL9-Base" \
    --organization "MyOrg"
```

## Promote Through Environments

```bash
# Promote version 1.0 to Development
hammer content-view version promote \
    --content-view "RHEL9-Base" \
    --version "1.0" \
    --to-lifecycle-environment "Development" \
    --organization "MyOrg"

# After testing, promote to QA
hammer content-view version promote \
    --content-view "RHEL9-Base" \
    --version "1.0" \
    --to-lifecycle-environment "QA" \
    --organization "MyOrg"

# Finally, promote to Production
hammer content-view version promote \
    --content-view "RHEL9-Base" \
    --version "1.0" \
    --to-lifecycle-environment "Production" \
    --organization "MyOrg"
```

This workflow ensures that only tested, approved content reaches your production RHEL systems through Satellite.
