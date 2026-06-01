# Validation Summary: How to Build a Student Assignment Submission Portal with Power Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Power Apps canvas apps
- SharePoint Online lists and document libraries
- PnP PowerShell
- Power Automate
- Power BI
- Microsoft 365 permissions

## Sources Consulted
- PnP PowerShell Add-PnPField documentation: https://pnp.github.io/powershell/cmdlets/Add-PnPField.html
- PnP PowerShell Add-PnPFieldFromXml documentation: https://pnp.github.io/powershell/cmdlets/Add-PnPFieldFromXml.html
- Microsoft Learn, Power Apps Attachments control: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-attachments
- Microsoft Learn, Power Fx Patch function: https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-patch
- Microsoft Learn, Power Fx Filter, Search, and LookUp functions: https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-filter-lookup
- Microsoft Learn, Power Fx operators and identifiers: https://learn.microsoft.com/en-us/power-platform/power-fx/reference/operators
- Microsoft Learn, Power Apps lookup columns with SharePoint: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/sharepoint-lookup-fields
- Microsoft Learn, Power Apps delegation overview: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview
- Microsoft Learn, Power Automate OData filters: https://learn.microsoft.com/en-us/power-automate/odata-filters

## Issues Found
- The PnP PowerShell setup script did not create several columns used later in the article, including Instructor, Course lookup fields, Assignment lookup fields, Student, FilePath, IsLate, and LatePenaltyPerDay. I added the missing fields and used `Add-PnPFieldFromXml` for lookup columns so the schema matches the Power Apps formulas.
- The post filtered student courses through an `Enrollments` data source that was not defined. I added an Enrollments list to the schema and PnP setup.
- The tenant URL placeholder was misspelled as `yourtenent`. I corrected it to `yourtenant`.
- The Power Apps formulas compared SharePoint lookup display values instead of stable lookup IDs and used nested record scopes that could be ambiguous. I updated the examples to use lookup IDs and the Power Fx `As` operator.
- The submission formula claimed to upload a file to a SharePoint document library but only built a folder path. I clarified that document-library upload requires a Power Automate flow or equivalent connector action and updated the formula to call an assumed upload flow that returns the file URL.
- The security section implied Power App filters could enforce access control. I corrected it to state that SharePoint permissions must be the security boundary and app filters are only interface logic.
- The Power Automate JSON snippets could be mistaken for importable flow definitions. I marked them as conceptual outlines.

## Review Notes
The revised tutorial is technically sound as a high-level implementation guide. The Power Automate upload flow and reminder flows still need to be configured in the Power Automate designer for a real tenant because connector actions and trigger schemas are environment-specific.
