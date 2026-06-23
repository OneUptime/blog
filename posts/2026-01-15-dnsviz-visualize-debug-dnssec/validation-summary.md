# Validation Summary: How to Use DNSViz to Visualize and Debug DNSSEC Issues

## Status
validated

## Post Type
Tutorial / Guide (DNSSEC debugging with the DNSViz toolset, plus CLI reference and operational scripts)

## Technologies Covered
- DNSViz (web interface + `dnsviz probe`, `dnsviz grok`, `dnsviz graph` CLI tools)
- DNSSEC (DNSKEY, RRSIG, DS, NSEC/NSEC3, KSK/ZSK, chain of trust, trust anchors)
- BIND DNS utilities (`dig`, `dnssec-dsfromkey`)
- Bash scripting for monitoring/automation
- Graphviz (`dot`) for rendering

## Sources Consulted
- DNSViz GitHub repository, including the `dnsviz-probe`, `dnsviz-grok`, and `dnsviz-graph` man pages and `README.md` (cloned from master): https://github.com/dnsviz/dnsviz
- `dnsviz/commands/grok.py` source (confirmed grok output is always JSON via `json.dumps`)
- Homebrew formula for dnsviz: https://formulae.brew.sh/formula/dnsviz
- Package availability confirmation for Debian/Ubuntu (apt), EPEL (dnf), and PyPI (pip)
- RFC 4034 (RRSIG/DNSKEY/DS wire and presentation format) for the RRSIG field-order claim
- IANA root anchors reference: https://data.iana.org/root-anchors/root-anchors.xml

## Issues Found
Six technical errors were found and corrected in `README.md`:

1. **`dnsviz probe -a` mislabeled as "digest algorithm".** The probe option table described `-a ALGORITHM` as "Specific digest algorithm to use." Per the man page, `-a` is `--ancestor` (the ancestor name to issue diagnostic queries toward, default root). Corrected the row to `-a ANCESTOR` with the accurate description.

2. **`dnsviz probe -D` mislabeled as DLV.** The table described `-D DLVKEY` as "Use DLV (deprecated but sometimes useful)." `-D` is actually `--ds` (supply DS records for a domain for testing, used together with `-N`); it has nothing to do with DLV (which is fully decommissioned per RFC 8749). Corrected to `-D DOMAIN:DS`.

3. **`dnsviz grok -o text` does not exist.** The post used `dnsviz grok -o text` in roughly nine places, described as "human-readable text" output. `dnsviz grok` always serializes its assessment to **JSON** (confirmed in source: `json.dumps`), and `-o` specifies an *output file*, not a format — so `-o text` would write to a file literally named `text`. Replaced every occurrence with `dnsviz grok -l warning` (the `-l/--log-level` filter is the documented way to reduce output to warnings/errors) and corrected the surrounding prose/comment. Also renamed the batch script's `$domain-analysis.txt` to `.json` to reflect the real output format.

4. **`dnsviz graph -Tpdf` is unsupported.** `dnsviz graph -T` only accepts `dot`, `png`, `jpg`, `svg`, and `html` (default `dot`); `pdf` is not a valid format. Replaced with the correct approach: emit `dot` and convert via Graphviz — `dnsviz graph -Tdot < example.json | dot -Tpdf > example.pdf`.

5. **`dnsviz graph -O` mislabeled as "Show only errors".** `-O` is `--derive-filename` (save output to a file whose name is derived from the format and domain). There is no "show only errors" flag for `dnsviz graph`. The original example also contradicted itself by redirecting to `errors.png`. Corrected the comment and changed the command to `dnsviz graph -O -Tpng -r example.json`.

6. **Invalid `probe | grok | graph` pipeline.** The "Full analysis pipeline" chained `dnsviz probe ... | dnsviz grok | dnsviz graph`. Both `grok` and `graph` consume `dnsviz probe` output (they are siblings, not sequential stages); feeding grok's assessment JSON into graph is incorrect. Changed to `dnsviz probe example.com | dnsviz graph -Tpng > result.png` and noted grok consumes the same probe output. (The later "intermediate files" example was already correct — graph reads `probe.json`, not `grok.json`.)

## Review Notes
- Installation instructions (apt, Homebrew, EPEL/dnf, pip) were all verified and are accurate — dnsviz is genuinely packaged for Debian/Ubuntu, in EPEL for RHEL 8/9, has a Homebrew formula, and is on PyPI.
- DNSSEC fundamentals (chain of trust, KSK/ZSK roles, record-type purposes), the RRSIG presentation field order (expiration before inception, per RFC 4034), Algorithm 13 = ECDSAP256SHA256, the `dig`/`dnssec-dsfromkey -2 -f -` DS-generation pattern, and the `dig +dnssec . DNSKEY | grep 257` KSK filter are all correct.
- The color/symbol interpretation tables are descriptive conventions and broadly match DNSViz's rendering; they're presented as guidance rather than exact spec, which is reasonable.
- `dnsviz grok -t /path/to/trust-anchor.key` is correct (`-t` = `--trusted-keys-file` for grok/graph). Note that `-t` means `--threads` for `probe` but `--trusted-keys-file` for `grok`/`graph`; the post uses each correctly.
- Minor future improvement: the monitoring/scripting examples grep grok's JSON output for keywords like "error"/"expired"; this works against the JSON but a more robust approach would parse the JSON (e.g. with `jq`) or check `dnsviz grok` exit codes. Not a correctness error, so left as-is.
