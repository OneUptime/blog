# Validation Summary: How to Use Dapr with Backstage Developer Portal

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Backstage Developer Portal (CNCF-graduated)
- Backstage Software Catalog (entity descriptors: Resource, Component)
- Backstage Scaffolder (software templates)
- Backstage TechDocs
- YAML configuration (app-config.yaml, catalog entities, scaffolder templates)

## Sources Consulted
- Backstage Descriptor Format of Catalog Entities: https://backstage.io/docs/features/software-catalog/descriptor-format/
- Backstage Catalog Configuration: https://backstage.io/docs/features/software-catalog/configuration/
- Backstage Writing Templates (Scaffolder): https://backstage.io/docs/features/software-templates/writing-templates/
- Backstage Well-known Annotations: https://backstage.io/docs/features/software-catalog/well-known-annotations/
- Backstage TechDocs - Creating and Publishing: https://backstage.io/docs/features/techdocs/creating-and-publishing/
- Dapr State Store Components Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found
No technical issues found.

## Review Notes
- The `dependsOn` references use the abbreviated format `resource:statestore-prod` rather than the fully qualified `resource:default/statestore-prod`. This is functionally correct since Backstage assumes the default namespace when none is specified, but readers should be aware the full format includes namespace.
- Backstage's claim of being "CNCF-graduated" is accurate (graduated in 2022).
- All catalog entity apiVersions (`backstage.io/v1alpha1`), kinds (`Resource`, `Component`), and spec fields are correct per current Backstage documentation.
- The Scaffolder template uses `apiVersion: scaffolder.backstage.io/v1beta3` which is the current stable version.
- All scaffolder actions (`fetch:template`, `publish:github`, `catalog:register`) and their input fields are correct.
- The `catalog.locations` config with `type: url` and `type: file` are both valid location types. Note that `type: file` is typically for local development; production setups usually use `url` or integration-based discovery.
- The TechDocs annotation `backstage.io/techdocs-ref: dir:.` is the correct and recommended format.
