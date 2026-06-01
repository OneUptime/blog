# Validation Summary: How to Create Custom Classifications and Classification Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Purview Data Map
- Microsoft Purview custom classifications
- Microsoft Purview classification rules
- Microsoft Purview scan rule sets
- Microsoft Purview REST APIs
- Python requests
- SQL
- Regular expressions

## Sources Consulted
- Microsoft Learn: Custom classifications in Microsoft Purview Data Map - https://learn.microsoft.com/en-us/purview/data-map-classification-custom
- Microsoft Learn: Classification best practices in Microsoft Purview Data Map - https://learn.microsoft.com/en-us/purview/data-gov-best-practices-classification
- Microsoft Learn: Automatically apply classifications on Data Map assets - https://learn.microsoft.com/en-us/purview/apply-classifications
- Microsoft Learn: Create a scan rule set in Microsoft Purview Data Map - https://learn.microsoft.com/en-us/purview/data-map-scan-rule-set
- Microsoft Learn REST API: Type - Bulk Create - https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/type/bulk-create?view=rest-purview-datamapdataplane-2023-09-01
- Microsoft Learn REST API: Classification Rules - Create Or Replace - https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/classification-rules/create-or-replace?view=rest-purview-scanningdataplane-2023-09-01
- Microsoft Learn REST API: Scan Rulesets - Create Or Replace - https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/scan-rulesets/create-or-replace?view=rest-purview-scanningdataplane-2023-09-01

## Issues Found
- The post implied custom classifications apply to unstructured fields during scanning. Updated the explanation to state that custom classifications are applied to structured data sources and structured file types.
- The post described the distinct threshold as distinct matching values. Updated it to the documented distinct data threshold behavior: enough distinct column values must exist before pattern evaluation.
- The custom classification portal example used a space-containing formal name and a category field. Updated the formal name to `Internal_Employee_ID`, removed the unsupported category field, and added the naming rule.
- The regex explanation and test data assumed `[A-Z]` rejects lowercase values. Updated the post to note that Purview custom classification regex matching is case-insensitive.
- The REST example used the older catalog path, `PUT`, and only created the classification while the section described creating the rule. Updated it to use the current Data Map type creation endpoint and added a current classification rule creation request.
- The dictionary example included a header row, which could be treated as a dictionary value. Updated it to a single-column value file.
- The scan rule set REST example used an outdated API version, an incorrect `kind` value, omitted `scanRulesetType`, and included an unsupported `dataPatternRules` field. Updated the payload to match the current scan ruleset API.
- The portal test instructions described entering individual values. Updated them to describe uploading a sample file with at least three columns, matching Microsoft documentation.

## Review Notes
The SQL test table and Python snippets are syntactically valid examples, but the REST examples still require a real Microsoft Purview account, a valid bearer token, and appropriate Purview permissions to execute successfully.
