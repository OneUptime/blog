# Parsing Cilium Bugtool Fish Completion Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Fish, Parsing, Scripting

Description: Extract command and flag definitions from cilium-bugtool fish completion output for documentation and analysis.

---

## Introduction

The fish shell provides a rich completion system with descriptions displayed inline as you type. The `cilium-bugtool completion fish` command generates a fish-compatible completion script that integrates with this system, providing tab completion for all cilium-bugtool subcommands and flags.




Fish completion scripts use a declarative format with `complete` commands that map directly to command-line options. This format is particularly straightforward to parse compared to bash or zsh completions.

This guide covers extracting and analyzing data from cilium-bugtool fish completion output.

## Prerequisites

- Fish shell (v3.0+)
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Capturing Completion Output




\`\`\`bash
# Capture the completion output
cilium-bugtool completion fish > /tmp/bugtool-fish-completion.fish
\`\`\`

### Extracting Commands and Descriptions

Fish completions use a consistent \`complete -c <command>\` format:

\`\`\`bash
# Extract subcommands with descriptions
grep -oP "complete -c cilium-bugtool.*-a\s+(\S+)\s+-d\s+'([^']+)'"   /tmp/bugtool-fish-completion.fish |   sed "s/complete.*-a //" | sed "s/ -d '/: /" | sed "s/'$//"

# Extract all flags
grep -oP "(-l|--)\s*[a-z][-a-z0-9]*" /tmp/bugtool-fish-completion.fish | sort -u
\`\`\`

### Python Parser for Fish Completions

\`\`\`python
#!/usr/bin/env python3
"""Parse cilium-bugtool fish completion output."""

import re
import json
import sys

def parse_fish_completion(filepath):
    with open(filepath) as f:
        lines = f.readlines()

    commands = []
    flags = []

    for line in lines:
        line = line.strip()
        if not line.startswith('complete'):
            continue

        # Extract subcommand with description
        cmd_match = re.search(r'-a\s+(\S+)(?:\s+-d\s+\'([^\']+)\')?', line)
        if cmd_match:
            commands.append({
                'name': cmd_match.group(1),
                'description': cmd_match.group(2) or ''
            })

        # Extract long flags
        flag_match = re.search(r'-l\s+(\S+)(?:\s+-d\s+\'([^\']+)\')?', line)
        if flag_match:
            flags.append({
                'flag': '--' + flag_match.group(1),
                'description': flag_match.group(2) or ''
            })

    return {
        'commands': commands,
        'flags': flags,
        'total_completions': len(lines)
    }

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bugtool-fish-completion.fish'
    result = parse_fish_completion(path)
    print(json.dumps(result, indent=2))
\`\`\`

## Verification

```bash
# Verify parsing
python3 parse_fish_completion.py /tmp/bugtool-fish-completion.fish | jq '.commands | length'
python3 parse_fish_completion.py /tmp/bugtool-fish-completion.fish | jq '.flags | length'
```

## Troubleshooting

- **Completions not appearing**: Ensure the file is in `~/.config/fish/completions/` and named `cilium-bugtool.fish`.
- **"Unknown command: complete"**: You may be sourcing in bash instead of fish. The file is fish-specific.
- **Stale completions after upgrade**: Regenerate with `cilium-bugtool completion fish`.
- **Permission denied writing to vendor directory**: Use the user-local completions directory instead.

## Conclusion




Fish completion scripts use a clean declarative format that is straightforward to parse. Extracting commands and flags from fish completions enables documentation generation and CLI analysis with minimal effort.
