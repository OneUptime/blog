# Validation Summary: How to Use Azure Boards Delivery Plans to Visualize Work Across Multiple Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps Delivery Plans
- Azure DevOps work items, backlogs, iterations, and dependencies
- Azure DevOps dashboards

## Sources Consulted
- Microsoft Learn: Add or edit a Delivery Plan in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/plans/add-edit-delivery-plan?view=azure-devops
- Microsoft Learn: Use team delivery plans in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/plans/review-team-plans?view=azure-devops
- Microsoft Learn: Track dependencies in Delivery Plans - https://learn.microsoft.com/en-us/azure/devops/boards/plans/track-dependencies?view=azure-devops
- Microsoft Learn: Add, rename, and delete dashboards - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/dashboards?view=azure-devops
- Microsoft Learn: Azure DevOps dashboards and charts FAQs - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/faqs?view=azure-devops

## Issues Found
- Corrected the plan creation flow to say team backlogs are specified during plan creation and can also be edited later. Microsoft documentation shows team backlog selection as part of the New Plan flow and also supports later edits from plan settings.
- Corrected card interaction details. The original text implied clicking a card expands details including the Description field; Microsoft documentation says card fields are configured from plan settings, rich-text fields such as Description cannot be added to cards, and work items are opened for field changes.
- Corrected the zoom section. Microsoft documentation describes zoom controls, expand/collapse cards, and horizontal scrolling, but does not document named Sprint, Month, and Quarter view modes.
- Corrected the sharing/dashboard guidance. Microsoft documentation indicates direct plan/dashboard access requires Azure DevOps project access, and dashboard dependency visibility is handled with related widgets such as Query Results rather than a native Delivery Plan dashboard widget.

## Review Notes
Delivery Plans is part of the Azure Boards core product for Azure DevOps Services and Azure DevOps Server 2022 and later. Azure DevOps Server 2020 and earlier use the Marketplace extension, which may have UI differences.
