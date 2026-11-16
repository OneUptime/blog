# Validation Summary: How to Verify That PII Redaction Runs on Every Outbound LLM Request Path

## Status

validated

## Post Type

Technical guide with a runnable Python testing example.

## Technologies Covered

- Python 3: recursive traversal, string replacement, deep copying, JSON serialization, exceptions, and assertions.
- Outbound LLM requests, streaming, retries, fallback providers, tool continuations, and background workers.
- Presidio Analyzer and Anonymizer, recognizer configuration, and PII detection evaluation.
- Network egress controls and provider-boundary request capture.

## Sources Consulted

- Python copy documentation: https://docs.python.org/3/library/copy.html — deep-copy semantics.
- Python JSON documentation: https://docs.python.org/3/library/json.html — serialization of nested dictionaries and lists.
- Python built-in types: https://docs.python.org/3/library/stdtypes.html#str.replace — string replacement and container behavior.
- Python errors and exceptions: https://docs.python.org/3/tutorial/errors.html — exception propagation and handler behavior.
- Presidio Analyzer concepts: https://presidio.dataprivacystack.org/analyzer/ — entity spans, recognizers, language configuration, and NLP engines.
- Presidio Anonymizer: https://presidio.dataprivacystack.org/anonymizer/ — transformations using analyzer results and operators.
- Presidio overview and limitations: https://presidio.dataprivacystack.org/ — separate text/image modules and incomplete automated detection. The post's https://data-privacy-stack.github.io/presidio/ link redirects here successfully.
- Presidio evaluation: https://presidio.dataprivacystack.org/evaluation/ — use-case-specific evaluation, false positives, false negatives, and synthetic datasets.
- Anthropic Python SDK documentation: https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/python — streaming requests carry input messages; timeout and rate-limit failures can trigger retries; custom HTTP clients are supported. Used as an official example supporting the provider-neutral guidance.
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/ — egress isolation and network-layer enforcement limits.
- Author link: https://www.github.com/nawazdhandala — resolves to the expected GitHub profile.

## Issues Found

No technical issues found.

## Review Notes

- Executed the complete Python code block from README.md using Python 3.15.0 with assertions enabled. It completed successfully. Additional checks confirmed exactly four captured requests and that every message content was replaced with `[REMOVED]`; the failing sanitizer produced no additional send.
- The example uses only Python's standard library and contains no deprecated API calls. There are no terminal commands, configuration snippets, or version-specific dependency claims to correct.
- The four loop labels do not exercise separate application handlers. The post explicitly acknowledges this and correctly requires invoking actual production entry points with capture enabled.
- The fixture replaces string values inside lists and dictionaries. It does not inspect dictionary keys, files, binary content, or arbitrary container types. The text appropriately requires accepted-schema validation and explicit unsupported-payload handling.
- Sanitizer exceptions stop this adapter before transport invocation. This demonstrates the stated failure behavior, not detection quality or full application routing coverage.
- The retry, fallback, immutable-request, serialized-body capture, worker, and streaming recommendations are technically sound. Whether a particular application implements them must be verified in that application's integration environment.
- Network policies can restrict egress at the network layer; they cannot establish that an in-process sanitizer ran. The article correctly treats egress controls as supplementary and calls for routing tests.
- The distinction between routing coverage, detector accuracy, destination-specific authorization, and telemetry policy is valid. Synthetic-marker success and an `applied` counter do not establish that all real PII was detected.
- Both Presidio references and the author link resolve to appropriate resources. No README.md changes were necessary. No live provider calls, production handler tests, or Presidio quality benchmarks were performed; those are application-specific procedures described by the guide.
