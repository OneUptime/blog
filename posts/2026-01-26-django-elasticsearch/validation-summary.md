# Validation Summary: How to Use Django with Elasticsearch

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Django
- django-elasticsearch-dsl
- Elasticsearch
- Elasticsearch DSL for Python
- Docker
- Django REST Framework
- Python

## Sources Consulted
- django-elasticsearch-dsl PyPI project and compatibility guidance: https://pypi.org/project/django-elasticsearch-dsl/
- django-elasticsearch-dsl quickstart documentation: https://django-elasticsearch-dsl.readthedocs.io/en/latest/quickstart.html
- django-elasticsearch-dsl settings documentation: https://django-elasticsearch-dsl.readthedocs.io/en/latest/settings.html
- django-elasticsearch-dsl management command documentation: https://django-elasticsearch-dsl.readthedocs.io/en/latest/management.html
- django-elasticsearch-dsl field and related model documentation: https://django-elasticsearch-dsl.readthedocs.io/en/latest/fields.html
- Elasticsearch DSL Search API documentation: https://elasticsearch-dsl.readthedocs.io/en/stable/search_dsl.html
- Elasticsearch suggester documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-suggesters
- Elastic Docker installation documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic

## Issues Found
- The install command did not pin `django-elasticsearch-dsl` and `elasticsearch` to the same Elasticsearch major version even though the post runs Elasticsearch 8.11.0. Updated the command to install compatible 8.x packages.
- The Docker command used the short `elasticsearch:8.11.0` image name instead of Elastic's documented registry path. Updated it to `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`.
- The "populate a specific index" command used `--populate -f`; `-f` is documented for delete/rebuild confirmation, not populate. Replaced it with a documented `--models products.Product` example.
- The `ignore_signals` comment said setting it to `True` enables automatic indexing. In django-elasticsearch-dsl, `ignore_signals=True` disables automatic signal-based indexing. Corrected the comment.
- `FacetedSearchService.search_with_facets()` called `_apply_filters_and_query()`, but that helper was not defined. Added the shared helper to `ProductSearchService` and reused it for both plain and faceted search.
- `search_with_facets()` ignored sorting and pagination parameters and did not return `page`, `page_size`, or `total_pages`, while the DRF serializer expected those fields. Added sorting, pagination, and pagination metadata.
- The phrase suggester example targeted the plain `name` text field. Updated the document mapping with a shingled `name.trigram` subfield and changed the phrase suggester/direct generator to use it, matching Elasticsearch's documented phrase suggester pattern.
- `ProductSearchResultSerializer.get_score()` assumed result objects had `.meta`, but the search services return dictionaries. Updated it to handle dict results.
- The mocked search test only mocked `.query().execute()`, but the service also calls `.filter()`, `.sort()`, and slicing. Updated the mock chain so the unit test reflects the current search flow.

## Review Notes
- The Python code blocks were syntax-checked with `python3 compile()` extraction from the Markdown and all 19 Python blocks compiled successfully.
- The examples remain illustrative and assume an app named `products` for the `--models products.Product` command.
