# Validation Summary: How to Use FT.SPELLCHECK in Redis for Fuzzy Search

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RediSearch (FT.SPELLCHECK, FT.DICTADD, FT.CREATE, FT.SEARCH)

## Sources Consulted
- Official Redis FT.SPELLCHECK documentation: https://redis.io/docs/latest/commands/ft.spellcheck/
- Official Redis FT.DICTADD documentation: https://redis.io/docs/latest/commands/ft.dictadd/
- Official Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis spellcheck concepts page: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/spellcheck/

## Issues Found

1. **Incorrect output for correctly-spelled terms (CRITICAL)**: The post showed FT.SPELLCHECK returning TERM entries with `(empty array)` for correctly-spelled terms and claimed "Empty suggestion arrays mean the term exists in the index." This is wrong. FT.SPELLCHECK returns an empty result when all terms are correctly spelled; only misspelled terms appear in the response. Fixed the example output and explanation.

2. **Inaccurate score description**: The post said the score is "proportional to how frequently the suggested term appears" and "50% of documents containing that term were considered." The actual score is calculated by dividing the number of documents containing the suggested term by the total number of documents in the index. Fixed to use the precise definition from official docs.

3. **TERMS syntax showed multiple dictionaries**: The syntax line used `[TERMS INCLUDE|EXCLUDE dict [dict ...]]` suggesting you can pass multiple dictionaries in one clause. The official syntax takes a single dictionary per TERMS clause; to use multiple dictionaries, separate TERMS clauses are needed. Fixed to show single dictionary.

4. **INCLUDE dictionary behavior description**: The post said included dictionary terms "are treated as valid words and will appear as suggestions," which is vague. The actual behavior is that INCLUDE dictionary terms become suggestion candidates with a score of 0 regardless of index presence. Fixed to mention the score of 0.

## Review Notes
- The DISTANCE 4 performance degradation claim is reasonable general guidance but is not explicitly documented in official Redis docs. Left as-is since it's a practical observation, not a factual error.
- The `--` comment syntax used in Redis code blocks is not standard Redis syntax (Redis uses no comment delimiter in the CLI). However, this is a common convention in blog tutorials for readability and was left unchanged.
- FT.CREATE, FT.DICTADD, HSET syntax and usage are all correct.
- The mermaid diagrams accurately represent the described workflows.
