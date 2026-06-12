# Validation Summary: How to Use Rails with PostgreSQL Full-Text Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ruby on Rails
- Active Record migrations
- PostgreSQL full-text search
- PostgreSQL GIN indexes
- PostgreSQL pg_trgm extension
- pg_search Ruby gem

## Sources Consulted
- PostgreSQL documentation: Full Text Search, controlling text search, `to_tsvector`, `tsquery`, ranking, and highlighting: https://www.postgresql.org/docs/current/textsearch-controls.html
- PostgreSQL documentation: Text search functions and operators, including `ts_headline`: https://www.postgresql.org/docs/current/functions-textsearch.html
- PostgreSQL documentation: `pg_trgm` extension, similarity functions, and trigram index support: https://www.postgresql.org/docs/current/pgtrgm.html
- Rails API documentation: ActiveRecord `add_index`, operator classes, and concurrent index options: https://api.rubyonrails.org/classes/ActiveRecord/ConnectionAdapters/SchemaStatements.html
- pg_search official README: search scopes, tsearch options, highlighting, trigram search, tsvector columns, ranking, and multisearch setup: https://github.com/Casecommons/pg_search

## Issues Found
- The basic search example said stemming makes `"running"` match `"runner"`. PostgreSQL English stemming handles variants such as `"running"` and `"runs"` matching `"run"`, but `"runner"` is not reliably reduced to the same lexeme. Changed the comment to avoid overclaiming.
- The pg_search highlighting example used snake_case option names such as `start_sel`, `max_words`, and `fragment_delimiter`. pg_search passes PostgreSQL `ts_headline` options, whose documented names are `StartSel`, `MaxWords`, `FragmentDelimiter`, and related CamelCase keys. Updated the snippet to use the documented option names.
- The article title autocomplete snippet claimed it used trigrams, but the code only used prefix `ILIKE` and did not define a trigram expression or trigram index for `articles.title`. Changed the comment to describe it as prefix autocomplete.
- The custom `global_search_config` lambdas referenced model attributes without a record argument, which would not work as plain class-level configuration lambdas. Updated them to accept `record` and read attributes from it.
- The pg_search multisearch section omitted the required migration generation and database migration for the `pg_search_documents` table. Added the documented setup commands before the multisearch configuration.
- The post metadata used `Ruby On Rail` as a tag. Updated it to the correct framework name, `Ruby on Rails`.

## Review Notes
The examples are technically valid as tutorial snippets, but production applications should ensure expression indexes match the exact generated SQL used by their search queries, and should benchmark `similarity()` predicates because pg_search notes that custom trigram thresholds can force table scans.
