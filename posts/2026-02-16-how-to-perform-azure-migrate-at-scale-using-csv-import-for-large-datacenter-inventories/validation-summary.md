# Validation Summary: How to Perform Azure Migrate at Scale Using CSV Import

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Migrate
- Azure Migrate Discovery and assessment
- CSV import
- Azure VM assessments
- Python CSV processing
- Azure portal workflows

## Sources Consulted
- Microsoft Learn: Build a business case or assess servers using an imported CSV file - https://learn.microsoft.com/en-us/azure/migrate/tutorial-discover-import
- Microsoft downloadable Azure Migrate CSV template - https://go.microsoft.com/fwlink/?linkid=2109031
- Microsoft Learn: Create an Azure VM assessment - https://learn.microsoft.com/en-us/azure/migrate/how-to-create-assessment
- Microsoft Learn: Best practices for creating assessments - https://learn.microsoft.com/en-us/azure/migrate/best-practices-assessment
- Microsoft Learn: Azure VM assessments in Azure Migrate - https://learn.microsoft.com/en-gb/azure/migrate/concepts-assessment-calculation
- Microsoft Learn: Azure CLI `az migrate` reference - https://learn.microsoft.com/en-us/cli/azure/migrate

## Issues Found
- The CSV header and examples used non-template column names such as `Memory (MB)`, `Disk 1 read IOPS`, `Disk 1 write IOPS`, and `NIC 1 throughput (MBps)`. Updated the header, sample CSV, and Python conversion script to match the current Microsoft CSV template fields, including `*Memory (In MB)`, disk throughput/ops fields, and network in/out throughput fields.
- The post listed Azure CLI as a prerequisite and used `az migrate assessment list-discovered-machine`, `az migrate assessment create`, and `az migrate assessment download-url`. These commands are not present in the current official Azure CLI `az migrate` reference. Replaced them with the documented Azure portal verification, assessment creation, and export steps.
- The post implied CSV-imported server records could directly support migration workflows. Added the Microsoft-documented limitation that servers imported using CSV can be assessed but cannot be migrated directly from those imported records.
- The multiple NIC guidance used unsupported `NIC 1 throughput` / `NIC 2 throughput` column names. Updated it to the documented network adapter count and network in/out throughput fields, and clarified that Azure Migrate supports up to 20 disks in the CSV template.
- The validation script checked outdated required field names and could reference an undefined row counter when validating an empty CSV. Updated it to check the current required template fields and use an explicit `row_count`.
- The assessment results list included migration-wave grouping suggestions, which are not a documented CSV assessment output. Replaced that item with assessment scope information.

## Review Notes
The corrected post now follows the current Microsoft portal-first workflow for import-based Azure Migrate assessments. The Azure CLI `az migrate` command group is currently preview and does not provide the assessment commands that were originally shown, so future automation examples should use documented REST APIs or wait for official CLI support.
