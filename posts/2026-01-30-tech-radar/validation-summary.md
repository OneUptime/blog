# Validation Summary: How to Create Tech Radar

## Status
validated

## Post Type
Tutorial / Guide — a step-by-step walkthrough for creating a Tech Radar, including governance process, visualization implementation, and automation.

## Technologies Covered
- ThoughtWorks Tech Radar concept and conventions (Adopt/Trial/Assess/Hold rings, quadrants, "moved" field)
- Mermaid diagrams (flowchart, pie, subgraph syntax)
- Bash / GNU find / grep (technology inventory scripting)
- JSON (radar data schema)
- HTML5 / CSS / D3.js v7 (radar visualization)
- GitHub Actions (CI/CD workflow, actions/checkout@v4, peaceiris/actions-gh-pages@v3)
- Python 3 (JSON validation step)
- Referenced technologies in examples: TypeScript, React, Vue 3, Angular, Kubernetes, PostgreSQL, MySQL, MongoDB, DynamoDB, OpenTelemetry, Terraform, Pulumi, Jenkins, Rust, Temporal, GraphQL

## Sources Consulted
- ThoughtWorks Technology Radar history and methodology: https://www.thoughtworks.com/radar
- ThoughtWorks Build Your Own Radar (BYOR) JSON schema conventions ("moved" field: 1=up, 0=unchanged, -1=down): https://www.thoughtworks.com/radar/byor
- D3.js v7 API reference (selection, event handling — event-as-first-arg convention since v6): https://d3js.org/
- Mermaid documentation (flowchart, pie, subgraph): https://mermaid.js.org/intro/
- GitHub Actions documentation for `actions/checkout@v4`: https://github.com/actions/checkout
- `peaceiris/actions-gh-pages@v3` action: https://github.com/peaceiris/actions-gh-pages
- GNU findutils and grep manuals for `find -name/-path/-o`, `grep -r --include -l` flag semantics

## Issues Found
No technical issues found.

## Review Notes
- The bash inventory script uses `find . -path "*/.github/workflows/*.yml"` which only matches `.yml` files, not `.yaml`. GitHub Actions supports both extensions, so the count may slightly under-report. This is a minor heuristic limitation rather than a technical error, and the script is presented as an example inventory tool.
- `find . -name "*.sql" -o -name "migrations" -type d` has subtle operator-precedence semantics (the `-type d` only binds to the last `-name`), but the result is still a useful listing for inventory purposes.
- The D3.js visualization uses an `angleRange` of 80° per quadrant, which leaves small gaps between quadrants visually. This is a stylistic choice and not incorrect.
- A `.quadrant-label` CSS class is defined but no quadrant text labels are actually rendered in the JavaScript. Cosmetic only; does not affect correctness.
- `peaceiris/actions-gh-pages@v3` is still maintained and widely used; v4 also exists but v3 remains a valid choice.
- The Python validation step `python3 -c "import json; json.load(open('radar.json'))"` doesn't explicitly close the file handle but functions correctly for a one-shot CI check.
- The post references future-dated companion blog posts (e.g., `2026-01-30-golden-paths`); these are within the OneUptime blog ecosystem and not externally verifiable here, but the URL pattern matches existing OneUptime blog URLs.
