# Validation Summary: How to Use Python Templates in Deployment Manager for Dynamic Resource Creation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deployment Manager
- Deployment Manager Python templates
- Deployment Manager schemas
- Google Cloud CLI
- Compute Engine resources
- Cloud Storage buckets
- Python
- YAML

## Sources Consulted
- Google Cloud Deployment Manager documentation: https://docs.cloud.google.com/deployment-manager/docs
- Deployment Manager deprecation notice: https://cloud.google.com/deployment-manager/docs/deprecations
- Creating a basic Deployment Manager template: https://cloud.google.com/deployment-manager/docs/configuration/templates/create-basic-template
- Deployment-specific environment variables: https://docs.cloud.google.com/deployment-manager/docs/configuration/templates/use-environment-variables
- Deployment Manager configuration overview and template limitations: https://cloud.google.com/deployment-manager/docs/configuration
- Deployment Manager template modules: https://docs.cloud.google.com/deployment-manager/docs/configuration/templates/create-template-modules
- Deployment Manager schemas: https://cloud.google.com/deployment-manager/docs/configuration/templates/using-schemas
- Supported Deployment Manager resource types: https://cloud.google.com/deployment-manager/docs/configuration/supported-resource-types
- Previewing a Deployment Manager configuration: https://docs.cloud.google.com/deployment-manager/docs/configuration/preview-configuration-file
- gcloud deployments create reference: https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/create
- gcloud deployments describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/describe
- Compute Engine instances.insert REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances/insert
- Compute Engine firewalls REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/firewalls
- Compute Engine routers REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/routers

## Issues Found
- The post description implied that Deployment Manager Python templates can perform API calls. Google Cloud documentation states that Python templates run in a controlled environment and cannot make system or network calls. I removed the "API calls" wording and adjusted the introduction to refer to input properties rather than runtime inputs.
- Deployment Manager reached end of support on March 31, 2026. I added a note explaining that the guide is for maintaining existing or historical templates and that active deployments should migrate to Infrastructure Manager or another supported IaC tool.
- The firewall template always emitted `sourceRanges`, even for `EGRESS` rules. The Compute Engine Firewall API has `destinationRanges` for destination IP ranges. I updated the template to use `destinationRanges` for `EGRESS` and `sourceRanges` otherwise.
- The local test script tried to import `multi-zone-instances.py` using `from multi_zone_instances import GenerateConfig`, which would fail because the filename contains hyphens and is not importable as a normal Python module. I changed the example to load the file with `importlib.util.spec_from_file_location`.

## Review Notes
The remaining Deployment Manager template structure, `GenerateConfig(context)` function contract, context environment variables, schema naming convention, schema fields, resource type names, and `gcloud deployment-manager deployments create --preview` / `describe --format` usage match official documentation. I could not verify commands locally with `gcloud --help` because the Google Cloud CLI is not installed in this workspace, so command verification was based on the official CLI reference.
