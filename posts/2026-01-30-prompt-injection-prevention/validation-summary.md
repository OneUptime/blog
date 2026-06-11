# Validation Summary: How to Build Prompt Injection Prevention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (regex, dataclasses, enums, typing)
- OpenAI Python SDK (v1.x) — `openai.OpenAI` client and Chat Completions API
- pytest (test fixtures and assertions)
- Mermaid diagrams (flowcharts)
- LLM security concepts (prompt injection, defense-in-depth, allowlists, sandwich pattern)
- hashlib for fingerprinting
- Python logging module

## Sources Consulted
- OWASP Top 10 for LLM Applications (LLM01: Prompt Injection) — https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OpenAI Python SDK documentation — https://github.com/openai/openai-python
- OpenAI Chat Completions API reference — https://platform.openai.com/docs/api-reference/chat
- OpenAI models reference (gpt-4o, gpt-4o-mini) — https://platform.openai.com/docs/models
- Python `datetime` module documentation — https://docs.python.org/3/library/datetime.html (specifically the deprecation of `datetime.utcnow()` in Python 3.12)
- Python `re` module documentation — https://docs.python.org/3/library/re.html
- Python `dataclasses` documentation — https://docs.python.org/3/library/dataclasses.html
- Python `enum` documentation — https://docs.python.org/3/library/enum.html
- pytest fixtures documentation — https://docs.pytest.org/en/stable/explanation/fixtures.html
- Mermaid flowchart syntax — https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- **`datetime.utcnow()` deprecation**: The `SecurityLogger.log_event` method used `datetime.utcnow().isoformat()`, which has been deprecated since Python 3.12 (emits `DeprecationWarning`) and is scheduled for removal in a future Python release. Replaced with `datetime.now(timezone.utc).isoformat()` and added `timezone` to the `from datetime import ...` line. The output ISO format gains a `+00:00` UTC offset, which is the modern, correct, timezone-aware representation.

## Review Notes
- The OpenAI SDK usage (`from openai import OpenAI`, `OpenAI(api_key=...)`, `client.chat.completions.create(...)`, `response.choices[0].message.content`) is correct for the v1.x SDK.
- Model names `gpt-4o` and `gpt-4o-mini` are valid current OpenAI model identifiers.
- The `InjectionScorer` and `OutputSanitizer` snippets use `re` but don't re-import it within the snippet itself; this is a common tutorial pattern (the reader is expected to keep imports from the first snippet). Not a correctness bug.
- `OutputSanitizer._create_fingerprints` uses MD5, which is fine for non-cryptographic fingerprinting (the use case here is similarity detection, not integrity). No change needed.
- The fingerprint window size of 50 words means very short system prompts (<50 words) produce zero fingerprints and would silently skip the leakage check. The tutorial's example `HARDENED_SYSTEM_PROMPT` is comfortably longer than 50 words, so this is not an issue for the example, but production users should be aware.
- The `RISK_THRESHOLDS` dict in `InjectionScorer` relies on Python 3.7+ insertion-order iteration to walk LOW → MEDIUM → HIGH → CRITICAL. This is guaranteed behavior, so the logic is sound.
- `Optional` is imported from `typing` in `SecureLLMPipeline` but not used. Harmless dead import; left as-is to avoid stylistic changes beyond the technical fix.
- `dict[ActionType, Callable]` type-hint syntax requires Python 3.9+. The post does not state a minimum Python version; readers on 3.8 or earlier would need `from typing import Dict` instead. Worth noting for future revisions but not a present-day correctness issue.
- The regex patterns in `PromptValidator.INJECTION_PATTERNS` are reasonable heuristics, though defense-in-depth (as the post itself argues) is essential — pattern matching alone is easily bypassed.
