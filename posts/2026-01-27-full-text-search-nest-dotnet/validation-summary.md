# Validation Summary: How to Build Full-Text Search with NEST in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- Elasticsearch
- NEST 7.x
- Elasticsearch .NET client APIs
- Full-text search
- Elasticsearch analyzers, mappings, queries, highlighting, and aggregations

## Sources Consulted
- Elastic NEST 7.17 getting started documentation: https://www.elastic.co/guide/en/elasticsearch/client/net-api/7.17/nest-getting-started.html
- Elastic NEST 7.17 configuration options: https://www.elastic.co/guide/en/elasticsearch/client/net-api/7.17/configuration-options.html
- Elastic NEST 7.17 attribute mapping documentation: https://www.elastic.co/guide/en/elasticsearch/client/net-api/7.17/attribute-mapping.html
- Elastic NEST 7.17 indexing documents documentation: https://www.elastic.co/guide/en/elasticsearch/client/net-api/7.17/indexing-documents.html
- Elastic NEST 7.17 writing queries documentation: https://www.elastic.co/guide/en/elasticsearch/client/net-api/7.17/writing-queries.html
- Elastic .NET client migration guide from NEST v7 to the v8 client: https://www.elastic.co/guide/en/elasticsearch/client/net-api/8.19/migration-guide.html
- Elastic .NET client current reference: https://www.elastic.co/docs/reference/elasticsearch/clients/dotnet
- NEST NuGet package page: https://www.nuget.org/packages/NEST/
- Microsoft .NET CLI package add documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Elasticsearch bool query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch multi-match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch edge n-gram token filter documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenfilter
- Elasticsearch terms aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Elasticsearch range aggregation documentation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-range-aggregation

## Issues Found
- The post described NEST as the official Elasticsearch .NET client without noting that NEST is now the legacy 7.x high-level client. Updated the description and introduction to identify NEST 7.x as legacy and point new Elasticsearch 8.x and 9.x applications to `Elastic.Clients.Elasticsearch`, matching Elastic's current migration guidance and NuGet deprecation notice.
- The package install command did not pin a NEST version. Updated the command to install `NEST` version `7.17.5`, which is the relevant legacy NEST line for this tutorial, and included both .NET 10+ noun-first and .NET 9-or-earlier verb-first CLI forms.
- The mapping examples used field mapping boosts on `Name`. Removed mapping-time boosts and kept relevance tuning in the search queries, where the article already uses field boosts.
- The `UpdateAsync` example accepted an `Action<ProductDocument> updateAction` parameter but never used it. Replaced the parameter with a `ProductDocument document`, set `Id` and `UpdatedAt`, and sent it through `.Doc(document)` so the shown update method actually applies the supplied document update.

## Review Notes
The code remains a NEST 7.x tutorial. That is technically valid for maintaining legacy projects, but future articles should prefer `Elastic.Clients.Elasticsearch` for new Elasticsearch 8.x and 9.x applications.
