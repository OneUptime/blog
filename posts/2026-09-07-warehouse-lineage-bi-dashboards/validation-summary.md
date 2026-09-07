# Validation Summary: How to Connect Warehouse Lineage to Tableau, Looker, and Power BI Dashboards

## Status
validated

## Post Type
Technical integration guide with GraphQL, HTTP API, LookML, XMLA DMV, YAML, and JSON examples.

## Technologies Covered
- Tableau Metadata API, GraphQL, Tableau Catalog, and REST authentication
- Looker API 4.0, LookML, derived tables, and Content Validator
- Power BI lineage, XMLA, Analysis Services DMVs, DAX, Power Query M, TMDL, and lineage tags
- PostgreSQL connection and relation identities
- Canonical lineage graphs, provenance, and metadata reconciliation

## Sources Consulted
- [Tableau Metadata API getting started](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_start.html)
- [Tableau Metadata API model](https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_model.html)
- [Tableau lineage impact analysis](https://help.tableau.com/current/server/en-us/dm_lineage.htm)
- [Looker LookML terms and concepts](https://cloud.google.com/looker/docs/lookml-terms-and-concepts)
- [Looker Get All LookML Models API](https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/LookmlModel/all_lookml_models)
- [Looker Get LookML Model Explore API](https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/LookmlModel/lookml_model_explore)
- [Power BI data lineage view](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-lineage)
- [Power BI semantic model impact analysis](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-dataset-impact-analysis)
- [Power BI XMLA endpoint](https://learn.microsoft.com/en-us/fabric/enterprise/powerbi/service-premium-connect-tools)
- [Analysis Services dynamic management views](https://learn.microsoft.com/en-us/analysis-services/instances/use-dynamic-management-views-dmvs-to-monitor-analysis-services)
- [Looker SQL and substitution references](https://docs.cloud.google.com/looker/docs/sql-and-referring-to-lookml)
- [Looker derived tables](https://docs.cloud.google.com/looker/docs/derived-tables)
- [Looker Content Validator](https://docs.cloud.google.com/looker/docs/content-validation)
- [Looker Get All LookML Models (resolved documentation host)](https://docs.cloud.google.com/looker/docs/reference/looker-api/latest/methods/LookmlModel/all_lookml_models)
- [PostgreSQL schemas and qualified names](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [Power BI lineage tags](https://learn.microsoft.com/en-us/analysis-services/tom/lineage-tags-for-power-bi-semantic-models)
- [Power BI project semantic model files](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset)
- [Power BI visual calculations](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-visual-calculations-overview)

## Issues Found
1. **Immutable native IDs were assumed for every object.** Changed the requirement to stable adapter IDs with native IDs where available, and explained scoped LookML names and explicit rename reconciliation. LookML models and fields are identified by names that can change.
2. **Tableau custom SQL representation was confused with successful parsing.** Clarified that custom SQL has a `CustomSQLTable` representation while upstream lineage depends on SQL support. Unsupported SQL flags remain coverage gaps.
3. **The Explore request split its query string onto a separate line.** Joined the URI and query string so the example represents a usable request target. The documented API 4.0 route and requested response fields are supported.
4. **The PostgreSQL naming restriction was too strong.** PostgreSQL permits three-part names when the database component matches the connected database. Corrected the explanation while retaining the valid `public.fct_orders` reference.
5. **The Looker dependency referenced an undefined semantic field.** `${TABLE}.net_revenue` refers directly to a physical column; it does not create or reference a LookML dimension named `orders.net_revenue`. Corrected the lineage explanation without changing the valid measure definition.
6. **Derived-table categories were conflated.** Clarified that both SQL-based and native derived tables may be temporary or persistent, with independent build/refresh behavior associated with persistence.
7. **XMLA execution prerequisites were incomplete.** Included Premium Per User, read access, licensing and permissions, semantic-model database selection, and separate execution of the two DMV statements. The queries inventory measures and calculation dependencies, not all model objects.
8. **The JSON edge claimed unsupported warehouse evidence, used a display name as identity, and left dependency direction inconsistent.** Changed it to a measure-to-model-column dependency supported by `DISCOVER_CALC_DEPENDENCY`, using illustrative scoped lineage-tag keys. Explicitly defined `DEPENDS_ON` as consumer-to-input. Physical warehouse resolution still requires partition/source evidence as explained in the post.

## Review Notes
- This was a documentation-based technical review. No authenticated Tableau site, Looker instance, Power BI workspace, or warehouse was supplied; no live API calls, LookML compilation, or XMLA queries were executed.
- Checked all listed documentation links. Google documentation redirects to `docs.cloud.google.com`; the model-list page was successfully checked on that host after the original URL returned an incomplete response.
- The GraphQL inventory query matches Tableau's documented query shape. Availability of external metadata also depends on licensing and derived permissions; deployment-specific schemas and permissions still need verification.
- The LookML view is valid assuming the stated table and columns exist, `order_id` is a true primary key, and `net_revenue` is suitable for summation. API examples assume authentication and an instance base URL.
- The DMV names and M-dependency limitation are documented. Power BI XMLA exposes only supported rowsets and access remains permission-dependent. TMDL design metadata and deployed state can differ; visual calculations require report-level coverage.
- YAML and JSON examples are custom adapter schemas, not native platform configuration or a complete OpenLineage event. Endpoint aliases, IDs, producer version, and timestamps are illustrative.
- Coverage metrics and canary checks are sound design recommendations. Permission-hidden asset totals require an independent inventory or sufficient privileges; a restricted crawl alone cannot establish a complete denominator.
- No deprecated API was identified in the reviewed examples. API 4.0 is documented; exact capabilities remain release- and environment-dependent.
