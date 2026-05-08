# Validation Summary: How to Format Image List Output in Podman

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Podman
- Container images
- Go templates
- JSON output
- jq
- Bash scripting

## Sources Consulted
- Podman `podman-images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman system df` official documentation: https://docs.podman.io/en/stable/markdown/podman-system-df.1.html
- jq official manual: https://jqlang.github.io/jq/manual/
- GNU Coreutils `sort` manual: https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html

## Issues Found
- The JSON examples used capitalized field names such as `.Names` and `.Size`. Podman `images --format json` emits lower-case keys such as `names` and `size`, so those jq examples were updated.
- The large-image jq example used the same capitalized JSON field names. It was updated to use `.names` and `.size`.
- The dangling-image conditional checked whether `.Tag` was truthy, but dangling images are represented with the non-empty tag value `<none>`. The template now checks `eq .Tag "<none>"`.
- The sort example used the human-friendly `.Size` field with `sort -rh`, which can be unreliable because Podman separates the numeric value and unit. It now sorts the byte-oriented `.VirtualSize` field numerically.
- The recipe label "Show images older than their creation date" was technically inaccurate for the command shown. It now says "Show images with their creation age."

## Review Notes
The post is technically relevant and the remaining Podman flags, filters, Go template placeholders, table formatting examples, JSON format usage, and Bash script structure match the current official Podman documentation.
