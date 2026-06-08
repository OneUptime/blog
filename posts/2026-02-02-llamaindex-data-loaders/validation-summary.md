# Validation Summary: How to Use LlamaIndex Data Loaders

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LlamaIndex (core framework and readers ecosystem)
- LlamaParse (cloud-hosted PDF / document parser)
- Python (3.x)
- SimpleDirectoryReader, PDFReader (from `llama-index-readers-file`)
- SimpleWebPageReader, WholeSiteReader (from `llama-index-readers-web`)
- DatabaseReader (from `llama-index-readers-database`, uses SQLAlchemy)
- S3Reader (from `llama-index-readers-s3`, uses boto3/s3fs)
- GCSReader (from `llama-index-readers-gcs`)
- NotionPageReader (from `llama-index-readers-notion`)
- SlackReader (from `llama-index-readers-slack`)
- GithubRepositoryReader, GitHubRepositoryIssuesReader (from `llama-index-readers-github`)
- IngestionPipeline, SentenceSplitter, TitleExtractor, QuestionsAnsweredExtractor
- VectorStoreIndex, MetadataFilters

## Sources Consulted
- LlamaIndex official docs — Readers API reference: https://developers.llamaindex.ai/python/framework-api-reference/readers/
- LlamaIndex GitHub source — readers package `__init__` files and base classes in `llama-index-integrations/readers/`
- LlamaParse docs and PyPI: https://pypi.org/project/llama-parse/ and https://docs.llamaindex.ai/en/stable/module_guides/loading/connector/llama_parse/
- SlackReader source: `llama-index-readers-slack/llama_index/readers/slack/base.py`
- NotionPageReader source: `llama-index-readers-notion/llama_index/readers/notion/base.py`
- GitHub readers source: `llama-index-readers-github/llama_index/readers/github/{repository,issues}/base.py` and `__init__.py`
- PDFReader source: `llama-index-readers-file/llama_index/readers/file/docs/base.py`
- SimpleWebPageReader source: `llama-index-readers-web/llama_index/readers/web/simple_web/base.py`
- WholeSiteReader source: `llama-index-readers-web/llama_index/readers/web/whole_site/base.py`
- DatabaseReader source: `llama-index-readers-database/llama_index/readers/database/base.py`
- LlamaIndex metadata filtering docs / MetadataFilters API

## Issues Found

1. **`LlamaParse` import path was wrong.** The post imported `from llama_index.readers.file import LlamaParse`, but `LlamaParse` is not exported from `llama_index.readers.file`. It lives in its own `llama-parse` package and is imported as `from llama_parse import LlamaParse`. Fixed the import and added an install hint (`pip install llama-parse`) plus a note about `LLAMA_CLOUD_API_KEY`.

2. **`PDFReader.return_full_document` is a constructor parameter, not a `load_data` parameter.** The original code passed `return_full_document=False` to `pdf_reader.load_data(...)`, which would raise a TypeError. Moved the flag to `PDFReader(return_full_document=False)` and also wrapped the file path in `Path(...)` since `load_data` expects a `Path` / `PurePosixPath`.

3. **`SimpleWebPageReader` does not use BeautifulSoup.** The inline comment claimed BeautifulSoup handles parsing, but the reader actually uses the `html2text` library (and only when `html_to_text=True`). Comment updated to reflect this.

4. **`NotionPageReader.load_data` uses `database_ids` (plural list), not `database_id`.** The original example called `reader.load_data(database_id=database_id)`, which would be silently ignored / cause an error. Changed to `database_ids=[...]` matching the actual signature.

5. **`SlackReader` date filters are constructor parameters and accept `datetime` objects.** The post passed `earliest_date`/`latest_date` as strings to `load_data`, but those parameters live on `__init__` and take `datetime` instances. Moved them to the constructor and wrapped in `datetime(...)`.

6. **`GithubRepositoryReader` does not accept `github_token` directly.** It requires a pre-built `GithubClient` passed as `github_client=`. In addition, `filter_file_extensions` and `filter_directories` are `Tuple[List[str], FilterType]` (include/exclude semantics), not plain lists. Updated the example to instantiate `GithubClient(...)` first and to pass the tuples with `GithubRepositoryReader.FilterType.INCLUDE`.

7. **`GithubIssuesReader` does not exist under that name and does not accept `github_token` directly.** The actual exported class is `GitHubRepositoryIssuesReader` (note the GitHub capitalization), and it requires a `GitHubIssuesClient`. The `state` argument is `GitHubRepositoryIssuesReader.IssueState` (an enum), not a raw string. Updated import, instantiation, and `load_data(state=...)`.

8. **`as_query_engine(filters={...})` does not accept a plain dict.** The original passed `filters={"source_type": "web"}`, but LlamaIndex requires a `MetadataFilters` object containing `MetadataFilter` entries. Imported `MetadataFilter` and `MetadataFilters` from `llama_index.core.vector_stores` and rebuilt the filter.

## Review Notes

- `WholeSiteReader` requires Selenium and ChromeDriver (`chromedriver-autoinstaller` is invoked under the hood). The code in the post is technically correct, but readers should be aware they need a Chrome installation; this was not added to the post to keep the author's scope intact.
- The `llama-index-readers-llama-parse` PyPI package is deprecated in favor of the standalone `llama-parse` (and the newer `llama-cloud-services`) package. The corrected import uses the supported `llama_parse` package, which is the current canonical path as of the review date.
- `DatabaseReader` (constructor `uri=...`) is correct; under the hood the reader actually exposes `lazy_load_data` and `load_data` returns a list; usage in the post is fine.
- `SimpleDirectoryReader` metadata keys (`file_name`) used in the post match the current implementation.
- The `S3Reader` example uses `aws_access_id` / `aws_access_secret`, which are the correct (if slightly unusual) parameter names in the current `llama-index-readers-s3` package.
- The post relies on placeholder URLs (`docs.example.com`, `api.example.com`) and placeholder credentials throughout, which is appropriate for a tutorial.
- No version pins were given for `llama-index`; the corrected examples target the current modular layout (`llama-index>=0.10` with separate reader packages), which matches the install commands shown.
