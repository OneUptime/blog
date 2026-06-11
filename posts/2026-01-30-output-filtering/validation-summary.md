# Validation Summary: How to Implement Output Filtering

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Python 3 (dataclasses, enum, typing, asyncio)
- Hugging Face Transformers (`pipeline`, `AutoModelForSequenceClassification`, `AutoTokenizer`)
- PyTorch (inference, `torch.softmax`, `torch.no_grad`)
- sentence-transformers (`SentenceTransformer`, `all-MiniLM-L6-v2`)
- NumPy (cosine similarity computation)
- Python `re` module (regex compilation, flags, character classes)
- pytest (testing framework with fixtures)
- LLM guardrails / output filtering patterns (toxicity, PII, jailbreak detection)
- Models referenced: `unitary/toxic-bert`, `facebook/roberta-hate-speech-dynabench-r4-target`
- Luhn algorithm for credit card validation

## Sources Consulted
- Hugging Face Transformers documentation for `pipeline` — https://huggingface.co/docs/transformers/main_classes/pipelines (specifically the `TextClassificationPipeline` and the `return_all_scores` deprecation in favor of `top_k`, introduced in transformers 4.27.0)
- Hugging Face model card for `unitary/toxic-bert` — https://huggingface.co/unitary/toxic-bert (labels: `toxic`, `severe_toxic`, `obscene`, `threat`, `insult`, `identity_hate`)
- Hugging Face model card for `facebook/roberta-hate-speech-dynabench-r4-target` — https://huggingface.co/facebook/roberta-hate-speech-dynabench-r4-target
- Python `re` module documentation — https://docs.python.org/3/library/re.html (semantics of `|` inside character classes `[...]`)
- Luhn algorithm reference — ISO/IEC 7812-1 / Wikipedia
- sentence-transformers documentation — https://www.sbert.net/

## Issues Found

1. **Deprecated transformers API**: The `ToxicityFilter.__init__` passed `return_all_scores=True` to `pipeline(...)`. This argument was deprecated in transformers 4.27.0 and replaced with `top_k=None`. Replaced `return_all_scores=True` with `top_k=None` so the example works on modern transformers releases without emitting a `FutureWarning` (and avoids removal in future major versions).

2. **Broken email regex character class**: The PII detector's email pattern used `[A-Z|a-z]{2,}` for the TLD portion. Inside a character class `[...]`, `|` is a literal pipe character, not alternation — so the regex would (a) match TLDs that contain a literal `|` and (b) communicate the wrong intent to readers. Replaced with `[A-Za-z]{2,}`, which is the standard form for "two or more ASCII letters" (case-insensitivity is moot here because `re.IGNORECASE` is applied at compile time, but the corrected form is unambiguous).

## Review Notes

- **`unitary/toxic-bert` label check**: The `ToxicityFilter.check` loop skips labels equal to `"non-toxic"`. The actual labels emitted by `unitary/toxic-bert` are `toxic`, `severe_toxic`, `obscene`, `threat`, `insult`, `identity_hate` — there is no `non-toxic` label. The check is effectively a no-op (always True), but it does not cause incorrect behavior: every label is a toxic category, so the threshold comparison still gates correctly. Left as-is since it is defensive code that does not break functionality, and the post acknowledges model-specific tuning elsewhere. A future revision could either drop the check or document the actual label set.
- **`facebook/roberta-hate-speech-dynabench-r4-target` is binary**: The `ContentClassifier` example uses thresholds for many categories (`violence`, `self_harm`, `sexual`, `hate`, `harassment`, `dangerous`), but the chosen model is a binary hate-speech classifier. The post correctly notes this in `_map_to_categories` with the comment "This mapping depends on your specific model's label order. Adjust based on the model you use." This is presented as an architectural template rather than a drop-in implementation, so it is acceptable but worth keeping in mind.
- **`typing.Pattern`** is used in the regex filter (`from typing import ... Pattern`). It has been deprecated since Python 3.8 in favor of `re.Pattern`, but still works (and the alias is not slated for removal). Not changed.
- **`datetime.utcnow()`** appears in the secure-logging example. Python 3.12 deprecates it in favor of `datetime.now(datetime.UTC)`. Still functional and very common in real code, so left as-is.
- **`re.IGNORECASE` applied to all PII patterns** has no effect on digit-only patterns (SSN, phone, credit card, IP). Harmless.
- **`hash(result.original_text)`** in the audit-log example uses Python's non-cryptographic built-in. For genuine audit logs, `hashlib.sha256` would be more appropriate, but the example's intent is illustrative.
- All mermaid diagrams are syntactically valid.
- All `pytest` assertions and fixtures use current/standard APIs.
- The Luhn implementation is correct (standard right-to-left doubling on alternate digits, subtract 9 when > 9, sum, check mod 10 == 0; length bounded to ISO/IEC 7812-1 valid PAN lengths 13–19).
