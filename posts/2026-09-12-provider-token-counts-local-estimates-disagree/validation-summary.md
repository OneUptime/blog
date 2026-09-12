# Validation Summary: Why Provider Token Counts and Local Estimates Disagree

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- LLM token accounting and observability
- Anthropic Messages API token counting and streaming
- Prompt caching and reasoning-token usage categories
- LangChain token usage metadata
- Python
- JSON application schemas

## Sources Consulted

- [Anthropic token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Anthropic streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic Messages API reference](https://platform.claude.com/docs/en/api/typescript/messages)
- [LangChain models: token usage](https://docs.langchain.com/oss/python/langchain/models)
- [LangChain messages: usage metadata](https://docs.langchain.com/oss/python/langchain/messages)

## Issues Found

No technical issues found.

## Review Notes

The Python helper was executed with provider, estimate, and unknown cases, including a zero provider count, and behaved as described. The JSON example is valid and is clearly identified as an application-defined schema rather than a provider response. Provider usage categories remain intentionally provider-specific; in particular, Anthropic cached input totals require interpreting `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens` together, which is consistent with the post's warning not to collapse or remap categories without documented semantics.
