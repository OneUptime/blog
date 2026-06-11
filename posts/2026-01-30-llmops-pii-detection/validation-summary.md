# Validation Summary: How to Build PII Detection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Presidio Analyzer
- Microsoft Presidio Anonymizer
- spaCy language models
- Python
- pytest
- OpenTelemetry Python API and SDK
- PII masking, hashing, encryption, and placeholder replacement patterns

## Sources Consulted
- Microsoft Presidio installation documentation: https://microsoft.github.io/presidio/installation/
- Microsoft Presidio Analyzer documentation: https://microsoft.github.io/presidio/analyzer/
- Microsoft Presidio Anonymizer documentation: https://microsoft.github.io/presidio/anonymizer/
- Microsoft Presidio custom analyzer examples: https://microsoft.github.io/presidio/samples/python/customizing_presidio_analyzer/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The basic Presidio example analyzed all entity types while the shown output only listed selected entities. Presidio can also return overlapping or lower-confidence entities such as URL, DATE_TIME, US_BANK_NUMBER, and US_DRIVER_LICENSE for the sample text. I constrained the example to the entities it intends to demonstrate and sorted results by text position so the printed output matches the post.
- The post stated that checksum validation applies to credit cards and SSNs. Presidio does apply validation where applicable, but SSNs do not have a checksum. I changed the wording to use credit cards as the example.
- The OpenAI API key regex only allowed alphanumeric characters after `sk-`. I broadened it to allow underscores and hyphens so it covers common modern key shapes.
- The masking strategy examples manually replaced raw analyzer spans without handling overlap. This corrupted email replacements when Presidio also detected URL spans inside the email. I added an overlap filter that keeps the highest-confidence span before manual hash, placeholder, and encryption replacement.
- The LLM pipeline's `mask_in_responses` option detected and logged response PII but did not actually mask the response. I updated the example to replace the response with sanitized text when response PII is found.
- The code used `datetime.utcnow()`, which is deprecated in Python 3.12. I updated it to timezone-aware `datetime.now(timezone.utc)`.
- The optimized detector skipped full Presidio analysis whenever the quick regex pre-check found no pattern-like PII, which would miss NER-based PII such as names and locations. I changed this to an explicit `quick_pattern_only` option and kept full analysis as the default.
- The compliance profile merge logic treated `0` retention days as falsey and could convert "never retain" into `None`. I added a helper that preserves `0` as a valid strict retention value.
- Two pytest examples did not match current Presidio behavior: the international phone example was not detected, and the DOB example was below the test's confidence filter. I changed them to examples that Presidio currently detects at the intended confidence.

## Review Notes
The runnable Python snippets were syntax-checked and executed with current `presidio-analyzer`, `presidio-anonymizer`, `spacy`, `cryptography`, `opentelemetry-api`, and `opentelemetry-sdk` packages installed into an isolated `.tmp` target directory. The pytest block was syntax-checked and its corrected edge cases were manually verified because pytest discovery expects the block to be saved as a real test file.
