# Parsing Output from Cilium Agent Zsh Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Zsh, Shell Completion, Parsing, Scripting, Kubernetes

Description: Learn how to parse and analyze the output of cilium-agent completion zsh to extract command structures, build documentation, and create custom tooling around the Cilium CLI.

---

## Introduction

The `cilium-agent completion zsh` command generates a zsh completion script that contains a structured representation of all cilium-agent subcommands, flags, and their descriptions. This output is a rich data source that can be parsed programmatically to build documentation, create wrapper scripts, or validate CLI coverage in tests.

Parsing completion output goes beyond simply installing it in your shell. By extracting the command tree and flag definitions, you can generate reference docs, audit which commands lack descriptions, or build automation that adapts to new Cilium releases.

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

# Preview the structure
head -50 /tmp/cilium-agent-completion.zsh
```

From a running pod if the binary is not local:

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-agent completion zsh > /tmp/cilium-agent-completion.zsh
```

## Extracting Subcommands

Zsh completion scripts define commands in structured blocks. Extract the available subcommands:

```bash
# Extract command names from the completion script
grep -E "commands\+=\(|'[a-z-]+\[" /tmp/cilium-agent-completion.zsh | \
  grep -oP "'[a-z][-a-z]*" | \
  tr -d "'" | \
  sort -u

# Alternative: extract from _describe or compadd calls
grep -E "(compadd|_describe)" /tmp/cilium-agent-completion.zsh | \
  grep -oP "'[^']+'" | \
  tr -d "'" | \
  sort -u | head -30
```

## Extracting Flags and Their Descriptions

Flags in zsh completion files follow patterns with descriptions in brackets:

```bash
#!/bin/bash
# extract-flags.sh
# Parse cilium-agent zsh completion to extract all flags with descriptions

INPUT="/tmp/cilium-agent-completion.zsh"

echo "Flag|Description"
echo "----|----------"

grep -oP "'--[a-z][-a-z0-9]*\[.*?\]" "$INPUT" | \
  sed "s/'--/--/" | \
  sed 's/\[/|/' | \
  sed 's/\]//' | \
  sort -u | while IFS='|' read -r flag desc; do
    echo "$flag|$desc"
  done
```

```bash
chmod +x extract-flags.sh
./extract-flags.sh | column -t -s'|'
```

## Building a Command Tree with Python

For more structured parsing, use Python to build a complete command tree:

```python
#!/usr/bin/env python3
"""Parse cilium-agent zsh completion output into a structured command tree."""

import re
import json
import sys

def parse_completion_file(filepath):
    """Extract commands and flags from a zsh completion script."""
    with open(filepath, 'r') as f:
        content = f.read()

    result = {
        'commands': [],
        'flags': [],
        'subcommands': {}
    }

    # Extract top-level commands
    cmd_pattern = re.compile(r"'(\w[-\w]*):(.*?)'")
    for match in cmd_pattern.finditer(content):
        cmd_name = match.group(1)
        cmd_desc = match.group(2).strip()
        result['commands'].append({
            'name': cmd_name,
            'description': cmd_desc
        })

    # Extract flags with descriptions
    flag_pattern = re.compile(r"'(--[\w-]+)\[(.*?)\]")
    for match in flag_pattern.finditer(content):
        flag_name = match.group(1)
        flag_desc = match.group(2).strip()
        result['flags'].append({
            'flag': flag_name,
            'description': flag_desc
        })

    return result

if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else '/tmp/cilium-agent-completion.zsh'
    tree = parse_completion_file(filepath)
    print(json.dumps(tree, indent=2))
```

```bash
python3 parse_completion.py /tmp/cilium-agent-completion.zsh | jq '.commands | length'
```

## Generating Markdown Documentation from Completions

Convert the parsed data into reference documentation:

```bash
#!/bin/bash
# gen-docs-from-completion.sh
# Generate markdown docs from cilium-agent completion output

INPUT="/tmp/cilium-agent-completion.zsh"
OUTPUT="/tmp/cilium-agent-reference.md"

echo "# cilium-agent Command Reference" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Auto-generated from zsh completion output." >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "## Commands" >> "$OUTPUT"
echo "" >> "$OUTPUT"

grep -oP "'(\w[-\w]*):(.*?)'" "$INPUT" | \
  tr -d "'" | \
  sort -u | while IFS=':' read -r cmd desc; do
    echo "- **$cmd**: $desc" >> "$OUTPUT"
  done

echo "" >> "$OUTPUT"
echo "## Global Flags" >> "$OUTPUT"
echo "" >> "$OUTPUT"

grep -oP "'(--[\w-]+)\[(.*?)\]" "$INPUT" | \
  tr -d "'" | \
  sort -u | while IFS='[' read -r flag desc; do
    desc="${desc%]}"
    echo "- \`$flag\`: $desc" >> "$OUTPUT"
  done

echo "Documentation generated at $OUTPUT"
cat "$OUTPUT" | head -30
```

## Verification

Validate your parsing produces consistent results:

```bash
# Count extracted commands and compare across versions
CMDS=$(grep -oP "'(\w[-\w]*):" /tmp/cilium-agent-completion.zsh | sort -u | wc -l)
FLAGS=$(grep -oP "'--[\w-]+" /tmp/cilium-agent-completion.zsh | sort -u | wc -l)

echo "Extracted $CMDS commands and $FLAGS flags"

# Verify JSON output is valid
python3 parse_completion.py /tmp/cilium-agent-completion.zsh | jq . > /dev/null && \
  echo "JSON output is valid"
```

## Troubleshooting

- **No commands extracted**: The completion format may differ between Cilium versions. Check the raw file structure with `head -100` and adjust regex patterns.
- **Duplicate entries in output**: Add `sort -u` at the end of your pipeline to deduplicate.
- **Special characters in descriptions**: Escape brackets and quotes when parsing. Use Python for robust handling of edge cases.
- **Empty output from kubectl exec**: Ensure you are targeting the `cilium-agent` container, not an init container.

## Conclusion

Parsing the output of `cilium-agent completion zsh` unlocks the ability to auto-generate documentation, build validation tests, and create tooling that stays synchronized with the Cilium CLI. Whether you use simple shell pipelines or structured Python parsing, the completion script serves as a machine-readable specification of the entire command interface.
