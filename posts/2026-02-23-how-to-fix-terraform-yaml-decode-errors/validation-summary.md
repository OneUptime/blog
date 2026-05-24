# Validation Summary: How to Fix Terraform YAML Decode Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (`yamldecode()`, `yamlencode()`, `tostring()`, `try()`, `file()`)
- YAML 1.2
- HCL configuration syntax
- `yamllint`, `yq`, Python `yaml.safe_load` for external validation

## Sources Consulted
- HashiCorp Terraform `yamldecode` documentation: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- `go-cty-yaml` resolver source (the library underlying Terraform's YAML parsing): https://github.com/zclconf/go-cty-yaml (`resolve.go`)
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Terraform GitHub issue #31369 ("yamldecode does not support anchors for mapping keys")

## Issues Found

1. **Cause 6 incorrectly claimed anchors and aliases are not supported.** The HashiCorp documentation explicitly states that "aliases to earlier anchors are supported," and the `go-cty-yaml` source (which Terraform uses) includes an `isMergeKey` implementation, so the merge key (`<<:`) example shown in the original post would actually work. The real limitations are (a) cyclic data structures and (b) anchors used as mapping keys (per upstream issue #31369). Rewrote the section to reflect the actual supported/unsupported behavior, kept the flattened-YAML fallback example, and added an aliases-as-keys example that does fail.
2. **Best Practices item #6 repeated the same incorrect claim** ("Anchors, aliases, and multi-document files are not supported"). Updated to: "Multi-document files, anchors as mapping keys, and cyclic structures are not supported."

## Review Notes

- The `yes`/`no`/`on`/`off` claim in Cause 4 is correct for Terraform — verified directly in `go-cty-yaml`'s `resolveMap`, which recognizes `y/Y/yes/Yes/YES`, `on/On/ON`, `n/N/no/No/NO`, and `off/Off/OFF` as booleans alongside `true`/`false`. This is broader than the strict YAML 1.2 Core Schema but matches the library's behavior, so the advice to quote ambiguous values stands.
- Cause 7's claim about `zipcode: 01234` being parsed as octal `668` is generic across YAML parsers; in Terraform specifically the `go-cty-yaml` integer regex `[-+]?[0-9]+` would parse it as the decimal integer `1234`. The "quote to force a string" advice is still correct, so I left the wording — it's framed as a cross-parser caveat ("in some parsers... in others").
- The `grep -P` and `sed -i` examples are GNU-specific; macOS users will need `grep -E $'\t'` and `sed -i ''`. Not technically wrong, just a portability note that could be added in the future.
- Error message strings shown in code fences are illustrative of typical errors rather than exact verbatim Terraform output — acceptable for a troubleshooting guide.
- The `try(yamldecode(...), {})` pattern in Cause 8 is correct and idiomatic Terraform.
