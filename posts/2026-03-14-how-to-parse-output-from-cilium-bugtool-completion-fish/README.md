# Parsing Cilium Bugtool Fish Completion Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Fish, Parsing, Scripting

Description: Extract command and flag definitions from cilium-bugtool fish completion output for documentation and analysis.

---

## Introduction

The fish shell provides a rich completion system with descriptions displayed inline as you type. The `cilium-bugtool completion fish` command generates a fish-compatible completion script that integrates with this system, providing tab completion for all cilium-bugtool subcommands and flags.




Fish completion scripts use the `complete` command, and modern Cobra-generated completions resolve candidates dynamically through fish. This makes the completion output queryable with fish itself, which is more reliable than parsing the generated script as a static list.

This guide covers extracting and analyzing data from cilium-bugtool fish completion output.

## Prerequisites

- Fish shell (v3.0+)
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Capturing Completion Output




```bash
## Capture the completion output
cilium-bugtool completion fish > /tmp/bugtool-fish-completion.fish
```

### Extracting Commands and Descriptions

Modern Cobra-generated fish completions define dynamic `complete -c <command>` entries. Source the generated script in fish, then ask fish for the completions it would show:

```bash
## Extract subcommands with descriptions
fish -c 'source /tmp/bugtool-fish-completion.fish; complete --do-complete "cilium-bugtool "' | awk -F "\t" '{print $1 ": " $2}'

## Extract all flags
fish -c 'source /tmp/bugtool-fish-completion.fish; complete --do-complete "cilium-bugtool -"' | awk -F "\t" '{print $1}' | sort -u
```

### Python Parser for Fish Completions

```python
#!/usr/bin/env python3
"""Parse cilium-bugtool fish completion output."""

import json
import sys
import subprocess
import shlex

def parse_fish_completion(filepath):
    source_path = shlex.quote(filepath)

    def get_completions(commandline):
        fish_command = f'source {source_path}; complete --do-complete {shlex.quote(commandline)}'
        output = subprocess.check_output(['fish', '-c', fish_command], text=True)
        return [line for line in output.splitlines() if line]

    def parse_completion_line(line):
        value, _, description = line.partition('\t')
        return value, description

    commands = []
    flags = []

    for line in get_completions('cilium-bugtool '):
        name, description = parse_completion_line(line)
        if name and not name.startswith('-'):
            commands.append({
                'name': name,
                'description': description
            })

    for line in get_completions('cilium-bugtool -'):
        flag, description = parse_completion_line(line)
        if flag.startswith('--'):
            flags.append({
                'flag': flag,
                'description': description
            })

    return {
        'commands': commands,
        'flags': flags,
        'total_completions': len(commands) + len(flags)
    }

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bugtool-fish-completion.fish'
    result = parse_fish_completion(path)
    print(json.dumps(result, indent=2))
```

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




Fish completion scripts expose a clean interface through fish's completion engine. Extracting commands and flags from fish completions enables documentation generation and CLI analysis with minimal effort.
