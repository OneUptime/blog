# Validation Summary: How to Parse and Validate JSON Schema in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- JSON
- JSON Schema
- gojsonschema
- HTTP API request validation

## Sources Consulted
- gojsonschema package documentation: https://pkg.go.dev/github.com/xeipuuv/gojsonschema
- gojsonschema GitHub README: https://github.com/xeipuuv/gojsonschema
- JSON Schema Draft 2020-12 Core specification: https://json-schema.org/draft/2020-12/json-schema-core
- JSON Schema Draft 2020-12 Validation specification: https://json-schema.org/draft/2020-12/json-schema-validation

## Issues Found
- The introductory schema used Draft 2020-12 while the post focuses on `gojsonschema`, which officially supports draft-04, draft-06, and draft-07. Changed the schema declaration to the draft-07 meta-schema URI.
- The text described `gojsonschema` as offering broad JSON Schema draft support without naming its supported drafts. Updated the wording to state draft-04, draft-06, and draft-07 support explicitly.
- The file-loading example built `file://` references directly from the function arguments. `gojsonschema` documents that file references require the `file://` prefix and a full path, so the example now resolves schema and document paths with `filepath.Abs` before building the URI.
- The reusable validator example used `package validator`, while the later HTTP example called `NewJSONValidator` from `package main` without an import. Changed the validator example to `package main` so the examples compose as shown.

## Review Notes
The Go toolchain is not installed in this environment, so I could not compile or run the snippets locally. The review was completed against the official `gojsonschema` documentation and JSON Schema specifications.
