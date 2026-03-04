# How to Manage Errata and Patch Compliance with Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Errata, Patch Management, Compliance

Description: Track, apply, and enforce errata compliance across your RHEL fleet using Red Hat Satellite to maintain security and reduce patch drift.

---

Red Hat Satellite provides centralized errata management for RHEL hosts. You can view available patches, check compliance status, and apply errata across hundreds of systems from a single interface.

## View Available Errata

```bash
# List all errata available in the Satellite
hammer erratum list --organization "MyOrg"

# Filter by type (security, bugfix, enhancement)
hammer erratum list --organization "MyOrg" --errata-type security

# Search for a specific CVE
hammer erratum list --organization "MyOrg" --search "cve = CVE-2024-1234"
```

## Check Host Errata Status

```bash
# List errata applicable to a specific host
hammer host errata list --host "webserver1.example.com"

# Filter for security errata only
hammer host errata list --host "webserver1.example.com" --errata-type security

# View errata details
hammer erratum info --id "RHSA-2026:0123"
```

## Apply Errata to a Single Host

```bash
# Apply a specific erratum to a host
hammer host errata apply \
    --host "webserver1.example.com" \
    --errata-ids "RHSA-2026:0123"

# Apply all applicable security errata
hammer host errata apply \
    --host "webserver1.example.com" \
    --errata-type security
```

## Apply Errata to a Host Group

```bash
# List hosts in a host group with applicable errata
hammer host list --search "hostgroup = WebServers and applicable_errata > 0"

# Apply errata to all hosts in a group using remote execution
hammer job-invocation create \
    --job-template "Install Errata - Katello Script Default" \
    --search-query "hostgroup = WebServers" \
    --inputs "errata=RHSA-2026:0123"
```

## Check Compliance Reports

```bash
# View the errata compliance summary for all hosts
hammer host list --fields "Name,OS,Installable Errata (Security),Installable Errata (Bugfix)"

# Export errata report as CSV
hammer --csv host list \
    --fields "Name,Installable Errata (Security),Installable Errata (Bugfix)" \
    > /tmp/errata_report.csv
```

## Create an Errata Compliance Policy

Use content view filters to define which errata are approved for each environment:

```bash
# Create an errata date filter on a content view
hammer content-view filter create \
    --name "Security-Errata-Only" \
    --type erratum \
    --inclusion true \
    --content-view "RHEL9-Patched" \
    --organization "MyOrg"

hammer content-view filter rule create \
    --content-view-filter "Security-Errata-Only" \
    --content-view "RHEL9-Patched" \
    --organization "MyOrg" \
    --types security
```

## Schedule Automatic Errata Application

```bash
# Create a recurring job to apply security errata weekly
hammer recurring-logic create \
    --cron-line "0 2 * * 0"

# Set up a scheduled remote execution job
hammer job-invocation create \
    --job-template "Install Errata - Katello Script Default" \
    --search-query "hostgroup = Production" \
    --inputs "errata_type=security" \
    --start-at "2026-03-08 02:00:00"
```

## Monitor Patch Drift

```bash
# Find hosts that are behind on patches
hammer host list --search "applicable_errata_security > 5" \
    --fields "Name,Applicable Errata (Security)"

# Check when a host was last patched
hammer host info --name "webserver1.example.com" --fields "Installed At"
```

Satellite gives you visibility into errata compliance across your entire RHEL fleet and the tools to enforce consistent patching policies.
