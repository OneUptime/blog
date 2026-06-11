# Validation Summary: How to Create LLM Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- LLM application security
- Prompt injection and jailbreaking defenses
- Python
- Python regular expressions
- Python dataclasses and type hints
- Rate limiting
- Security logging and anomaly detection
- Output filtering and PII redaction

## Sources Consulted
- OWASP Top 10 for Large Language Model Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP LLM01:2025 Prompt Injection: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model.md
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Python `typing` documentation: https://docs.python.org/3/library/typing.html
- Python `re.findall` documentation: https://docs.python.org/3/library/re.html#re.findall

## Issues Found
- The `output_guard.py` snippet used `Tuple` in a return annotation but did not import it. Added `Tuple` to the `typing` import so the snippet imports successfully.
- The `monitoring.py` snippet used `Tuple` in a return annotation but did not import it. Added `Tuple` to the `typing` import so the snippet imports successfully.
- The API-key regex in `OutputGuard.SENSITIVE_PATTERNS` used a capturing group. Python's `re.findall()` returns captured groups instead of the full match when a capturing group is present, so only prefixes such as `sk-` would be redacted. Changed the group to a non-capturing group so the full key is redacted.
- The rate limiter configuration included daily token and cost limits, but `check_rate_limit()` did not enforce them. Added `tokens_day` and `cost_day` checks to match the documented behavior.
- `SecurityLogger._cleanup_old_aggregations()` compared minute keys using an incorrect string slice and did not reliably keep the last hour. Replaced it with timestamp parsing and a one-hour cutoff.
- `SecurityLogger.create_event()` used `datetime.utcnow()`, which is deprecated in Python 3.12+. Replaced it with `datetime.now(timezone.utc).isoformat()` for timezone-aware UTC timestamps.
- `SecurityLogger.get_stats(minutes=...)` accepted a time-window parameter but ignored it. Updated the method to filter aggregation keys by the requested window.

## Review Notes
The post is technically relevant and aligns with OWASP's LLM risk categories at a high level. The code examples are illustrative rather than a complete production package; future improvements could replace hard-coded model pricing examples with provider-configured pricing and use built-in generic type syntax for modern Python style.
