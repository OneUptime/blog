# How to Trace Plagiarism Detection Service Processing Time with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Plagiarism Detection, EdTech, Tracing

Description: Trace plagiarism detection service processing time and accuracy using OpenTelemetry for better EdTech system observability.

Plagiarism detection is a critical service in education technology, but it is also one of the most resource-intensive. When a student submits a paper, the system needs to compare it against potentially millions of documents in a reference database, check against web sources, and analyze writing patterns. These operations can take anywhere from a few seconds to several minutes depending on document length and system load. This post covers how to trace the entire plagiarism detection pipeline with OpenTelemetry.

## Plagiarism Detection Pipeline Architecture

A typical plagiarism detection system involves:

1. Document ingestion and text extraction
2. Text preprocessing (tokenization, normalization, fingerprinting)
3. Database comparison (matching against stored document fingerprints)
4. Web comparison (checking against online sources)
5. Similarity scoring and report generation

## Instrumenting Document Ingestion

The first step is extracting text from the submitted document. Different file formats require different extraction logic:

```python
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("plagiarism.detection")

def process_submission(submission_id, file_path, file_type):
    """Main entry point for plagiarism detection."""
    with tracer.start_as_current_span(
        "plagiarism.process_submission",
        attributes={
            "plagiarism.submission_id": submission_id,
            "plagiarism.file_type": file_type,
            "plagiarism.file_size_kb": get_file_size_kb(file_path),
        }
    ) as span:
        # Step 1: Extract text from the document
        with tracer.start_as_current_span(
            "plagiarism.extract_text",
            attributes={"plagiarism.file_type": file_type}
        ) as extract_span:
            if file_type == "pdf":
                text = extract_text_from_pdf(file_path)
            elif file_type == "docx":
                text = extract_text_from_docx(file_path)
            elif file_type == "txt":
                text = read_text_file(file_path)
            else:
                extract_span.set_status(StatusCode.ERROR, f"Unsupported file type: {file_type}")
                raise ValueError(f"Unsupported file type: {file_type}")

            extract_span.set_attribute("plagiarism.word_count", len(text.split()))
            extract_span.set_attribute("plagiarism.char_count", len(text))

        # Step 2: Preprocess and fingerprint
        fingerprints = preprocess_text(text, submission_id)

        # Step 3: Run comparisons
        db_results = compare_against_database(fingerprints, submission_id)
        web_results = compare_against_web(text, submission_id)

        # Step 4: Generate report
        report = generate_similarity_report(
            submission_id, db_results, web_results
        )

        span.set_attribute("plagiarism.similarity_score", report.overall_score)
        span.set_attribute("plagiarism.flagged", report.overall_score > 0.25)

        return report
```

## Tracing Text Preprocessing

The fingerprinting step creates n-grams or hash signatures that are compared against the reference database:

```python
def preprocess_text(text, submission_id):
    with tracer.start_as_current_span(
        "plagiarism.preprocess",
        attributes={"plagiarism.submission_id": submission_id}
    ) as span:
        # Tokenize the text
        with tracer.start_as_current_span("plagiarism.tokenize") as tok_span:
            tokens = tokenize(text)
            tok_span.set_attribute("plagiarism.token_count", len(tokens))

        # Generate n-gram fingerprints
        with tracer.start_as_current_span("plagiarism.fingerprint") as fp_span:
            fingerprints = generate_ngram_fingerprints(tokens, n=5)
            fp_span.set_attribute("plagiarism.fingerprint_count", len(fingerprints))
            fp_span.set_attribute("plagiarism.ngram_size", 5)

        # Winnow the fingerprints for efficient comparison
        with tracer.start_as_current_span("plagiarism.winnow") as win_span:
            winnowed = winnow_fingerprints(fingerprints, window_size=4)
            win_span.set_attribute("plagiarism.winnowed_count", len(winnowed))
            win_span.set_attribute("plagiarism.compression_ratio",
                                   len(winnowed) / len(fingerprints) if fingerprints else 0)

        span.set_attribute("plagiarism.total_fingerprints", len(winnowed))
        return winnowed
```

## Tracing Database Comparison

The database comparison is typically the most time-consuming step. It involves searching a large index of document fingerprints:

```python
from opentelemetry import metrics

meter = metrics.get_meter("plagiarism.detection")

db_query_latency = meter.create_histogram(
    "plagiarism.db_query_latency_ms",
    description="Time to query the document fingerprint database",
    unit="ms",
)

def compare_against_database(fingerprints, submission_id):
    with tracer.start_as_current_span(
        "plagiarism.db_comparison",
        attributes={
            "plagiarism.submission_id": submission_id,
            "plagiarism.fingerprint_count": len(fingerprints),
        }
    ) as span:
        import time
        start = time.time()

        # Query the fingerprint index in batches
        batch_size = 1000
        matches = []
        batches_processed = 0

        for i in range(0, len(fingerprints), batch_size):
            batch = fingerprints[i:i + batch_size]

            with tracer.start_as_current_span(
                "plagiarism.db_batch_query",
                attributes={
                    "plagiarism.batch_index": batches_processed,
                    "plagiarism.batch_size": len(batch),
                }
            ) as batch_span:
                batch_matches = query_fingerprint_index(batch)
                batch_span.set_attribute("plagiarism.batch_matches", len(batch_matches))
                matches.extend(batch_matches)
                batches_processed += 1

        duration_ms = (time.time() - start) * 1000
        db_query_latency.record(duration_ms)

        # Deduplicate and rank matches
        unique_sources = deduplicate_matches(matches)

        span.set_attribute("plagiarism.total_matches", len(matches))
        span.set_attribute("plagiarism.unique_sources", len(unique_sources))
        span.set_attribute("plagiarism.db_query_duration_ms", duration_ms)
        span.set_attribute("plagiarism.batches_processed", batches_processed)

        return unique_sources
```

## Tracing Web Source Comparison

Web comparison involves checking the submitted text against online sources, which introduces external API latency:

```python
def compare_against_web(text, submission_id):
    with tracer.start_as_current_span(
        "plagiarism.web_comparison",
        attributes={"plagiarism.submission_id": submission_id}
    ) as span:
        # Extract distinctive phrases to search for
        phrases = extract_distinctive_phrases(text, max_phrases=20)
        span.set_attribute("plagiarism.search_phrases", len(phrases))

        web_matches = []
        for phrase in phrases:
            with tracer.start_as_current_span(
                "plagiarism.web_search",
                attributes={
                    "plagiarism.phrase_length": len(phrase),
                }
            ) as search_span:
                results = search_web_for_phrase(phrase)
                search_span.set_attribute("plagiarism.web_results", len(results))
                web_matches.extend(results)

        span.set_attribute("plagiarism.total_web_matches", len(web_matches))
        return web_matches
```

## Monitoring Processing Queue Health

Track the processing queue to understand system throughput and wait times:

```python
queue_depth = meter.create_observable_gauge(
    "plagiarism.queue_depth",
    description="Number of submissions waiting for plagiarism detection",
)

processing_time = meter.create_histogram(
    "plagiarism.total_processing_seconds",
    description="Total time from submission to report generation",
    unit="s",
)
```

## Conclusion

Tracing plagiarism detection with OpenTelemetry gives you granular visibility into each stage of the pipeline. By monitoring text extraction, fingerprinting, database comparison, and web search steps independently, you can identify which stage is causing slow processing times and optimize accordingly. This is especially important during assignment deadline periods when submission volumes spike dramatically.
