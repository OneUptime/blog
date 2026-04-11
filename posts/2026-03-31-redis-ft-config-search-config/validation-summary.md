# Validation Summary: How to Use FT.CONFIG in Redis to Set Search Configuration

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- RediSearch module
- FT.CONFIG SET / FT.CONFIG GET commands

## Sources Consulted
- Redis official documentation for FT.CONFIG SET: https://redis.io/docs/latest/commands/ft.config-set/
- Redis official documentation for FT.CONFIG GET: https://redis.io/docs/latest/commands/ft.config-get/
- RediSearch configuration reference: https://redis.io/docs/latest/develop/interact/search-and-query/configuration/

## Issues Found

1. **MAXSEARCHRESULTS default was wrong**: The sample `FT.CONFIG GET *` output showed the default as `"10000"`. The actual Redis Open Source default is `"1000000"` (1 million). Fixed in sample output and added default note to the section.

2. **MAXAGGREGATERESULTS default was wrong**: The sample output showed the default as `"10000"`. The actual Redis Open Source default is `"-1"` (unlimited). Fixed in sample output and added default note to the section.

3. **MINPHONETIC was wrong on three counts**: (a) The option name is `MIN_PHONETIC_TERM_LEN`, not `MINPHONETIC`. (b) The default is `3`, not `5`. (c) The description said "minimum edit distance for phonetic matching" — it is actually "minimum term length (in characters) required for phonetic matching to be applied." All three errors were corrected.

4. **WORKERS description was misleading**: The post described WORKERS as "background threads used for indexing" and said "Increasing workers speeds up indexing." The official docs describe WORKERS as threads for "query processing and background tasks." Corrected the description.

5. **LANGUAGE, LANGUAGEFIELD, SCORE, SCOREFIELD are not FT.CONFIG options**: These appeared in the sample `FT.CONFIG GET *` output and LANGUAGE had its own section. These are per-index options set via `FT.CREATE`, not module-level configuration options available through `FT.CONFIG`. Removed them from the sample output, replaced the LANGUAGE section with DEFAULT_DIALECT (a real FT.CONFIG option), and removed the Multilingual Application scenario that used the non-existent `FT.CONFIG SET LANGUAGE` command.

6. **Multilingual Application scenario was invalid**: The scenario used `FT.CONFIG SET LANGUAGE english`, which is not a valid command. Removed this scenario since language is set per-index via `FT.CREATE`, not globally via `FT.CONFIG`.

## Review Notes
- FT.CONFIG also has a HELP subcommand (`FT.CONFIG HELP option`) not mentioned in the post. This is a minor omission, not an error.
- The ON_TIMEOUT configuration option (controls whether timed-out queries return partial results or an error) is not mentioned. The post states queries "return partial results" on timeout, which is the default behavior (ON_TIMEOUT RETURN), but the alternative FAIL mode exists.
- As of RediSearch 8.0.0 (bundled with Redis 8), FT.CONFIG commands are deprecated in favor of standard Redis CONFIG SET/GET with `search-` prefixed option names. The post does not mention this deprecation.
- MAXEXPANSIONS is documented as an alias for MAXPREFIXEXPANSIONS in current docs. The post uses MAXEXPANSIONS which still works but readers should be aware of the canonical name.
