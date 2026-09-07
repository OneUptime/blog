# Validation Summary: How to Trace Data Lineage from dbt Models All the Way to Power BI Measures

## Status
validated

## Post Type
Technical implementation guide with Python, DMV SQL, JSON, and dbt exposure YAML examples.

## Technologies Covered
- dbt manifests, catalogs, materializations, compiled SQL, and exposures
- Power BI and Microsoft Fabric semantic models, partitions, reports, and XMLA endpoints
- Analysis Services DMVs, DAX, TMDL, and lineage tags
- Power Query M and warehouse column mappings
- Python 3, JSON, and YAML
- PostgreSQL identifier semantics

## Sources Consulted
- dbt manifest artifact: https://docs.getdbt.com/reference/artifacts/manifest-json
- dbt catalog artifact: https://docs.getdbt.com/reference/artifacts/catalog-json
- Published catalog v1 JSON schema: https://schemas.getdbt.com/dbt/catalog/v1.json
- dbt JSON artifact settings: https://docs.getdbt.com/reference/global-configs/json-artifacts
- dbt materializations: https://docs.getdbt.com/docs/build/materializations
- dbt exposures: https://docs.getdbt.com/docs/build/exposures
- Power BI lineage view: https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-lineage
- XMLA connectivity and permissions: https://learn.microsoft.com/en-us/fabric/enterprise/powerbi/service-premium-connect-tools
- Analysis Services DMVs and supported rowsets: https://learn.microsoft.com/en-us/analysis-services/instances/use-dynamic-management-views-dmvs-to-monitor-analysis-services
- Power BI project semantic model definitions: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset
- Power BI project report definitions: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
- DataColumn.SourceColumn: https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.datacolumn.sourcecolumn?view=analysisservices-dotnet
- Measure.LineageTag: https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.measure.lineagetag?view=analysisservices-dotnet
- Column.LineageTag: https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.column.lineagetag?view=analysisservices-dotnet
- Analysis Services live connections and report measures: https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-analysis-services-tabular-data
- PostgreSQL lexical structure: https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- Python JSON API: https://docs.python.org/3/library/json.html
- Python pathlib API: https://docs.python.org/3/library/pathlib.html

## Issues Found
1. **Artifact generation was unconditional.** Qualified manifest output as the default behavior, allowing disabled JSON output and a configured target directory.
2. **Ephemeral models received fabricated physical identities.** The extractor now skips ephemeral models in the physical mapping while retaining their logical dependencies in the manifest. These models are inlined as CTEs, not built as warehouse relations. Also clarified that normalization follows extraction.
3. **Catalog shape was incorrectly described as an old/new version distinction.** The documentation calls columns an array, while its linked current v1 schema defines an object. Corrected the prose and comments to identify this discrepancy, retained defensive handling of both shapes, and distinguished permissive extraction from schema validation.
4. **Internal XMLA metadata permissions were omitted.** Added the enabled-endpoint and model Write permission requirements, clarified that Build alone does not expose internal metadata, and instructed readers to run the DMV statements separately against the target model.
5. **Deployment comparison overstated local-change detection.** Comparing committed TMDL with the deployed model detects undeployed committed changes, but cannot detect uncommitted local edits. Corrected that claim.
6. **Partition resolution did not complete column mapping.** Added the SourceColumn-to-partition-output step and traversal through SQL aliases and M transformations. Derived fields may have multiple warehouse inputs.
7. **Traversal stopped at every column.** Changed the terminal kind to source_column and required upstream edges for calculated columns and calculated-table columns. Specified reverse adjacency explicitly and included DirectQuery source columns.
8. **Artifact consumption was conflated with measure usage.** A semantic-model-to-report connection does not establish which measures the report uses. Added inspection of report field references and limited exposure comparison to directly consumed dbt models.
9. **Validation rules incorrectly rejected legitimate derived or non-warehouse objects.** Scoped missing-relation and catalog checks to objects expected to resolve to dbt-managed warehouse data, and required explicit classification of constants and other origins.
10. **TMDL was implied to supply a ready-made dependency graph.** Clarified that DAX dependencies must be derived by analyzing its expressions when XMLA dependency metadata is not used.

## Review Notes
- Compiled both Python snippets and executed them with synthetic fixtures. The extractor handled both column shapes, preserved mixed-case names and parents, and excluded ephemeral and non-model resources. Traversal reached source columns through calculated columns and intermediate measures and terminated with a cycle present.
- Parsed the JSON mapping and exposure YAML successfully; verified the exposure dependency values. The exposure fields and ref syntax match the official dbt documentation.
- DMV names and SELECT syntax were checked against Microsoft documentation. No live Power BI tenant, XMLA connection, warehouse, or production dbt artifacts were available, so this is documentation and fixture validation, not an end-to-end integration run.
- Confirmed the documented omission of M dependencies from DISCOVER_CALC_DEPENDENCY for enhanced-metadata models. SQL/M lineage extraction and TMDL expression analysis remain implementation tasks described by the guide rather than supplied parsers.
- Confirmed endpoint URL structure, lineage-tag purpose, project definition formats, and report-level measure support. Example endpoint names, GUID placeholders, timestamps, and object labels are illustrative, not live resources to connect to.
- Reviewed all official-documentation links. The unqualified measure lineage-tag URL initially failed in the browsing tool; the official URL with its API view parameter loaded successfully.
- The traversal helper returns resolved source columns only. As the post requires, a production collector must separately retain unresolved objects and account for model features and report/filter context before claiming complete impact analysis.
