# Validation Summary: How to Use the title Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (and the equivalent Terraform built-in function)
- HCL (HashiCorp Configuration Language)
- AWS provider resources used illustratively (`aws_instance`, `aws_cloudwatch_metric_alarm`)
- `tofu console` REPL

## Sources Consulted
- OpenTofu `title` function documentation: https://opentofu.org/docs/language/functions/title/
- Underlying `go-cty` stdlib implementation of `TitleFunc`: https://github.com/zclconf/go-cty/blob/main/cty/function/stdlib/string.go (uses Go's `strings.Title`, which capitalizes the first letter after each non-letter/non-digit character and leaves all other characters unchanged)
- Terraform `title` function documentation (same behavior): https://developer.hashicorp.com/terraform/language/functions/title
- HCL function reference for sibling functions used in examples (`replace`, `trimspace`, `lower`, `upper`)

## Issues Found
1. **Incorrect claim about lowercasing.** The Syntax section stated: "All other letters are lowercased." This is false — the underlying `TitleFunc` (`strings.Title` from the Go standard library, used by go-cty/OpenTofu) only capitalizes word-initial letters and leaves the remaining characters untouched. Replaced with: "Other letters are left unchanged (the function does not lowercase the rest of the string)."
2. **Incorrect example output.** The Basic Examples section showed `title("HELLO WORLD")` returning `"Hello World"`. Because the first letters of each word are already uppercase and `title` does not lowercase non-initial letters, the actual return value is `"HELLO WORLD"` (unchanged). Updated the comment to: `# Returns "HELLO WORLD" (unchanged; first letters are already uppercase)`.

## Review Notes
- All other examples (`title("hello world")`, `title("the quick brown fox")`, slug-to-display-name conversions, `title(replace(...))` patterns, the combined `trimspace`/`replace`/`title` pipeline, and the `title` vs `lower` vs `upper` comparison table) are correct.
- The "Limitations" section accurately notes that `title` capitalizes every word including small words like "a", "an", "the", "of", which is typical of simple word-boundary title casing.
- Worth noting for future readers (not changed in the post): Go's `strings.Title` is deprecated upstream in favor of `golang.org/x/text/cases`. OpenTofu's exposed behavior is unaffected, but the underlying implementation may shift over time.
- The AWS resource snippets are illustrative; they reference `data.aws_ami.ubuntu.id` without defining the data source, but this is acceptable shorthand consistent with the rest of the blog series.
