# Validation Summary: How to Build Data Normalization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 standard library: `datetime`, `re`, `difflib`, `dataclasses`, `math`, `json`
- Data normalization patterns for ETL/data pipelines
- ISO 8601 timestamp normalization
- E.164-style phone number formatting
- Min-max scaling, z-score standardization, unit conversion, and log scaling
- Apache Beam / Google Cloud Dataflow integration patterns
- PySpark DataFrame UDF integration patterns
- Observability metrics export patterns

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `difflib.SequenceMatcher` documentation: https://docs.python.org/3/library/difflib.html
- Python `math.log` documentation: https://docs.python.org/3/library/math.html
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam Python `ParDo.with_outputs` API documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.core.html
- Apache Spark PySpark `udf` API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html
- Apache Spark PySpark UDF and UDTF user guide: https://spark.apache.org/docs/latest/api/python/user_guide/udfandudtf.html
- ITU-T Recommendation E.164 page: https://www.itu.int/rec/t-rec-e.164/en
- OpenTelemetry Metrics Data Model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/

## Issues Found
- The timestamp normalizer used `datetime.fromtimestamp()` without a timezone for Unix timestamps. Python documents that this returns local time when `tz` is omitted, which is not appropriate for a standardized UTC ISO 8601 output. Updated it to use `timezone.utc`, parse ISO 8601 timestamps with `datetime.fromisoformat()`, normalize all parsed datetimes to UTC, and include a trailing `Z`.
- The timestamp normalizer caught `ValueError` and `OSError` but not `OverflowError`, which Python documents as a possible `fromtimestamp()` failure mode. Added `OverflowError` to the handled exceptions.
- The phone normalizer claimed E.164 output but did not enforce the E.164 maximum length constraint for international numbers. Added a 15-digit limit and rejected already-international numbers whose country code would start with `0`.
- The monitoring example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The monitoring example described its dictionary payload as "compatible with OpenTelemetry metrics", but the shown payload is not the OTLP/OpenTelemetry metrics data model. Reworded the docstring to say the payload can be adapted to OpenTelemetry metrics.
- The monitoring example used `Any` in annotations without importing it in that code block. Added `Any` to the `typing` import.

## Review Notes
- All Python code blocks compile under Python 3.12.3.
- The executable non-Beam/non-Spark examples were run successfully after the fixes.
- Apache Beam and PySpark were not installed in the local environment, so those integration snippets were not executed end to end. Their shown APIs were checked against official Apache Beam and Apache Spark documentation.
- The phone normalizer is still intentionally simplified; production E.164 normalization should usually use a numbering-plan-aware library such as Google's libphonenumber rather than regular expressions alone.
