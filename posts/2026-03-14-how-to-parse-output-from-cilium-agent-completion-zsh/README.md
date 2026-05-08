# Parsing Output from Cilium Agent Zsh Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Zsh, Shell Completion, Parsing, Scripting, Kubernetes

Description: Learn how to parse and analyze the output of cilium-agent completion zsh to extract command structures, build documentation, and create custom tooling around the Cilium CLI.

---

## Introduction

The `cilium-agent completion zsh` command generates a zsh completion script that calls Cobra's dynamic `__complete` endpoint to retrieve cilium-agent subcommands, flags, and their descriptions. That completion protocol is a rich data source that can be queried programmatically to build documentation, create wrapper scripts, or validate CLI coverage in tests.

Parsing completion output goes beyond simply installing it in your shell. By querying the same completion endpoint that the zsh script uses, you can generate reference docs, audit which commands lack descriptions, or build automation that adapts to new Cilium releases.

This guide shows practical techniques for parsing cilium-agent zsh completion output using standard Unix tools and scripting languages.

## Prerequisites

- `cilium-agent` binary or access to a Cilium pod
- Zsh or Bash shell
- `jq`, `grep`, `awk`, and `sed` available
- Python 3.x (optional, for structured parsing)

## Capturing the Completion Output

First, capture the raw completion script:

```bash
# Generate and save the completion output

cilium-agent completion zsh > /tmp/cilium-agent-completion.zsh

# Check the file size and line count
wc -l /tmp/cilium-agent-completion.zsh

# Preview the structure and confirm it calls __complete dynamically
head -50 /tmp/cilium-agent-completion.zsh
grep "__complete" /tmp/cilium-agent-completion.zsh
```

From a running pod if the binary is not local:

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-agent completion zsh > /tmp/cilium-agent-completion.zsh
```

Use the same `kubectl exec` form for the `__complete` examples below if `cilium-agent` is only available inside the pod.

## Extracting Subcommands

Modern Cobra-generated zsh completion scripts fetch candidates dynamically. Extract the available top-level subcommands from the same `__complete` output that the script consumes:

```bash
# Extract top-level command names
cilium-agent __complete "" 2>/dev/null | \
  awk -F '\t' '$1 !~ /^:/ && $1 !~ /^time=/ {print $1}' | \
  sort -u

# Alternative: include command descriptions
cilium-agent __complete "" 2>/dev/null | \
  awk -F '\t' '$1 !~ /^:/ && $1 !~ /^time=/ {print $1 "\t" $2}' | \
  sort -u | head -30
```

## Extracting Flags and Their Descriptions

The dynamic completion output returns candidates and descriptions separated by a tab:

```bash
#!/bin/bash
# extract-flags.sh
# Query cilium-agent completion to extract all top-level flags with descriptions

echo "Flag|Description"
echo "----|----------"

cilium-agent __complete -- 2>/dev/null | \
  awk -F '\t' '$1 ~ /^--/ {print $1 "|" $2}' | \
  sort -u | while IFS='|' read -r flag desc; do
    echo "$flag|$desc"
  done
```

```bash
chmod +x extract-flags.sh
./extract-flags.sh | column -t -s'|'
```

## Building a Command Tree with Python

For more structured parsing, use Python to build top-level command data:

```python
#!/usr/bin/env python3
"""Parse cilium-agent completion output into structured command data."""

import json
import subprocess

def completion_candidates(*args):
    """Return Cobra completion candidates for cilium-agent."""
    proc = subprocess.run(
        ['cilium-agent', '__complete', *args],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )

    candidates = []
    for line in proc.stdout.splitlines():
        if line.startswith(':') or line.startswith('time='):
            continue
        name, _, description = line.partition('\t')
        if name:
            candidates.append({
                'name': name,
                'description': description
            })
    return candidates

def parse_completion():
    """Extract top-level commands and flags from completion candidates."""
    root_candidates = completion_candidates('')
    flag_candidates = completion_candidates('--')

    result = {
        'commands': [
            item for item in root_candidates
            if not item['name'].startswith('-')
        ],
        'flags': [
            {
                'flag': item['name'],
                'description': item['description']
            }
            for item in flag_candidates
            if item['name'].startswith('--')
        ],
        'subcommands': {}
    }

    return result

if __name__ == '__main__':
    tree = parse_completion()
    print(json.dumps(tree, indent=2))
```

```bash
python3 parse_completion.py | jq '.commands | length'
```

## Generating Markdown Documentation from Completions

Convert the parsed data into reference documentation:

```bash
#!/bin/bash
# gen-docs-from-completion.sh
# Generate markdown docs from cilium-agent completion output

OUTPUT="/tmp/cilium-agent-reference.md"

echo "# cilium-agent Command Reference" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Auto-generated from zsh completion output." >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "## Commands" >> "$OUTPUT"
echo "" >> "$OUTPUT"

cilium-agent __complete "" 2>/dev/null | \
  awk -F '\t' '$1 !~ /^:/ && $1 !~ /^time=/ {print $1 "|" $2}' | \
  sort -u | while IFS='|' read -r cmd desc; do
    echo "- **$cmd**: $desc" >> "$OUTPUT"
  done

echo "" >> "$OUTPUT"
echo "## Global Flags" >> "$OUTPUT"
echo "" >> "$OUTPUT"

cilium-agent __complete -- 2>/dev/null | \
  awk -F '\t' '$1 ~ /^--/ {print $1 "|" $2}' | \
  sort -u | while IFS='|' read -r flag desc; do
    echo "- \`$flag\`: $desc" >> "$OUTPUT"
  done

echo "Documentation generated at $OUTPUT"
cat "$OUTPUT" | head -30
```

## Verification

Validate your parsing produces consistent results:

```bash
# Count extracted commands and compare across versions
CMDS=$(cilium-agent __complete "" 2>/dev/null | awk -F '\t' '$1 !~ /^:/ && $1 !~ /^time=/ {print $1}' | sort -u | wc -l)
FLAGS=$(cilium-agent __complete -- 2>/dev/null | awk -F '\t' '$1 ~ /^--/ {print $1}' | sort -u | wc -l)

echo "Extracted $CMDS commands and $FLAGS flags"

# Verify JSON output is valid
python3 parse_completion.py | jq . > /dev/null && \
  echo "JSON output is valid"
```

## Troubleshooting

- **No commands extracted**: The completion format may differ between Cilium versions. Check the raw file structure with `head -100` and adjust regex patterns.
- **Duplicate entries in output**: Add `sort -u` at the end of your pipeline to deduplicate.
- **Special characters in descriptions**: Escape brackets and quotes when parsing. Use Python for robust handling of edge cases.
- **Empty output from kubectl exec**: Ensure you are targeting the `cilium-agent` container, not an init container.

## Conclusion

Parsing the completion protocol used by `cilium-agent completion zsh` unlocks the ability to auto-generate documentation, build validation tests, and create tooling that stays synchronized with the Cilium CLI. Whether you use simple shell pipelines or structured Python parsing, the dynamic completion output serves as a machine-readable view of the command interface.
