# Validation Summary: How to Use Azure Bicep User-Defined Types and Type Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bicep
- Bicep user-defined data types
- Bicep decorators
- Bicep discriminated unions
- Bicep imports and exports
- Bicep parameter files
- Azure Resource Manager templates
- Azure App Service
- Azure SQL Database

## Sources Consulted
- Microsoft Learn: User-defined data types in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/user-defined-data-types
- Microsoft Learn: Data types in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/data-types
- Microsoft Learn: Imports in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-import
- Microsoft Learn: Create a parameters file for Bicep deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files
- Microsoft Learn: Bicep functions for Bicep parameters files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-parameters-file
- Microsoft Learn: Microsoft.Sql/servers Bicep resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/servers
- Bicep CLI 0.43.8 local validation of representative snippets

## Issues Found
- The post overstated compile-time validation for all parameter inputs. I clarified that Bicep validates values in Bicep expressions and `.bicepparam` files during authoring and compilation, while JSON parameter files are deployment parameter files rather than typed Bicep source.
- The SQL Server examples omitted `administratorLoginPassword`, which Microsoft documents as required when creating `Microsoft.Sql/servers`. I added a secure `sqlAdminPassword` parameter and wired it into both SQL Server snippets.
- The final parameter example used JSON while the surrounding text described compiler validation. I changed it to a `.bicepparam` example and used top-level `getSecret()` for the secure SQL password, matching Bicep parameter-file support.

## Review Notes
- The examples intentionally remain simplified and focus on Bicep type validation rather than production-ready App Service or SQL hardening.
- Optional property syntax, union types, property decorators, `@discriminator()`, `@export()`, and compile-time imports were verified against current Microsoft Bicep documentation and representative Bicep CLI builds.
