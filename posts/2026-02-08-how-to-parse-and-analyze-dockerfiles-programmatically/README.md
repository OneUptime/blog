# How to Parse and Analyze Dockerfiles Programmatically

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Parsing, Automation, Python, Go, DevOps, Security

Description: Learn how to parse Dockerfiles programmatically using Python, Go, and shell tools to build custom analysis and compliance checks.

---

Parsing Dockerfiles programmatically lets you build custom tooling around your container workflows. You might want to enforce company policies on base images, extract dependency information for auditing, auto-generate documentation, or build compliance checks that go beyond what standard linters offer. Whatever the reason, understanding how to break a Dockerfile into structured data opens up a lot of possibilities.

This guide covers multiple approaches to Dockerfile parsing, from simple regex-based shell scripts to proper AST parsing in Python and Go.

## Why Parse Dockerfiles

Standard linters like Hadolint enforce general best practices, but organizations often have custom rules. Here are real scenarios where programmatic parsing helps:

- Enforcing that all Dockerfiles use base images from an internal registry
- Checking that every image pins a specific SHA256 digest rather than a tag
- Extracting all external URLs referenced in ADD or RUN instructions for security review
- Generating a bill of materials listing every package installed in the image
- Validating that multi-stage builds follow naming conventions
- Detecting hardcoded secrets or credentials in environment variables

## Quick Parsing with Shell Tools

For simple checks, shell commands and grep patterns work fine. They are not robust enough for complex analysis but handle basic extraction tasks.

Extract key information from a Dockerfile using grep:

```bash
# Extract all FROM instructions (base images used)
grep -E "^FROM " Dockerfile
# Output: FROM python:3.12-slim AS builder
#         FROM debian:bookworm-slim

# List all exposed ports
grep -E "^EXPOSE " Dockerfile | awk '{print $2}'

# Find all COPY instructions
grep -E "^COPY " Dockerfile

# Extract all environment variables defined
grep -E "^ENV " Dockerfile

# Find RUN instructions that use curl or wget (potential remote fetches)
grep -E "^RUN.*\b(curl|wget)\b" Dockerfile

# Check if the Dockerfile uses a specific base image
grep -q "^FROM.*internal-registry.example.com" Dockerfile && echo "Uses internal registry" || echo "WARNING: External base image"
```

## Parsing with Python - dockerfile Library

The `dockerfile` Python package provides a proper parser that handles multi-line instructions, comments, escape characters, and all other Dockerfile syntax correctly.

Install the library:

```bash
# Install the dockerfile parsing library
pip install dockerfile
```

Parse a Dockerfile and inspect its structure:

```python
# parse_dockerfile.py - Parse and analyze a Dockerfile
import dockerfile

# Parse a Dockerfile from a file path
commands = dockerfile.parse_file("Dockerfile")

# Each command is a named tuple with these fields:
# - cmd: instruction name (FROM, RUN, COPY, etc.)
# - sub_cmd: sub-command if applicable
# - json: whether arguments are in JSON format
# - original: the original line from the Dockerfile
# - start_line: line number where the instruction starts
# - flags: any flags used (like --from=builder)
# - value: tuple of argument values

for cmd in commands:
    print(f"Line {cmd.start_line}: {cmd.cmd} {' '.join(cmd.value)}")
```

Build a more practical analyzer that extracts useful information:

```python
# analyze_dockerfile.py - Extract structured information
import dockerfile
import sys
import json

def analyze_dockerfile(path):
    """Parse a Dockerfile and extract structured information."""
    commands = dockerfile.parse_file(path)

    analysis = {
        "base_images": [],
        "stages": [],
        "exposed_ports": [],
        "env_vars": [],
        "labels": {},
        "copy_instructions": [],
        "run_commands": [],
        "has_healthcheck": False,
        "has_user_instruction": False,
    }

    current_stage = None

    for cmd in commands:
        instruction = cmd.cmd.upper()

        if instruction == "FROM":
            image = cmd.value[0]
            stage_name = None
            # Check for AS alias
            if len(cmd.value) >= 3 and cmd.value[1].upper() == "AS":
                stage_name = cmd.value[2]
            analysis["base_images"].append(image)
            analysis["stages"].append({
                "image": image,
                "name": stage_name,
                "line": cmd.start_line,
            })
            current_stage = stage_name

        elif instruction == "EXPOSE":
            for port in cmd.value:
                analysis["exposed_ports"].append(port)

        elif instruction == "ENV":
            # ENV can be key=value or key value format
            analysis["env_vars"].append(" ".join(cmd.value))

        elif instruction == "RUN":
            analysis["run_commands"].append({
                "command": " ".join(cmd.value),
                "line": cmd.start_line,
            })

        elif instruction == "COPY":
            analysis["copy_instructions"].append({
                "args": cmd.value,
                "flags": cmd.flags,
                "line": cmd.start_line,
            })

        elif instruction == "HEALTHCHECK":
            analysis["has_healthcheck"] = True

        elif instruction == "USER":
            analysis["has_user_instruction"] = True

        elif instruction == "LABEL":
            # Parse label key=value pairs
            for item in cmd.value:
                if "=" in item:
                    key, value = item.split("=", 1)
                    analysis["labels"][key] = value.strip('"')

    return analysis

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "Dockerfile"
    result = analyze_dockerfile(path)
    print(json.dumps(result, indent=2))
```

Run the analyzer:

```bash
# Analyze a Dockerfile and get JSON output
python analyze_dockerfile.py Dockerfile

# Pipe to jq for specific queries
python analyze_dockerfile.py Dockerfile | jq '.base_images'
python analyze_dockerfile.py Dockerfile | jq '.stages[] | select(.name != null)'
```

## Building Custom Compliance Checks

Use the parsed data to enforce organizational policies.

A compliance checker that validates Dockerfile rules:

```python
# compliance_check.py - Enforce custom Dockerfile policies
import dockerfile
import sys
import re

def check_compliance(path):
    """Check a Dockerfile against organizational policies."""
    commands = dockerfile.parse_file(path)
    violations = []

    for cmd in commands:
        instruction = cmd.cmd.upper()

        # Policy 1: All base images must come from internal registry
        if instruction == "FROM":
            image = cmd.value[0]
            if not image.startswith("registry.internal.com/"):
                # Allow scratch as a special case
                if image != "scratch":
                    violations.append({
                        "line": cmd.start_line,
                        "rule": "INTERNAL_REGISTRY",
                        "message": f"Base image '{image}' must use internal registry",
                    })

        # Policy 2: No hardcoded passwords or tokens in ENV
        if instruction == "ENV":
            value = " ".join(cmd.value).lower()
            sensitive_patterns = ["password", "secret", "token", "api_key", "private_key"]
            for pattern in sensitive_patterns:
                if pattern in value:
                    violations.append({
                        "line": cmd.start_line,
                        "rule": "NO_SECRETS_IN_ENV",
                        "message": f"Possible secret in ENV instruction: {pattern}",
                    })

        # Policy 3: RUN instructions must not use sudo
        if instruction == "RUN":
            command_text = " ".join(cmd.value)
            if "sudo " in command_text:
                violations.append({
                    "line": cmd.start_line,
                    "rule": "NO_SUDO",
                    "message": "Do not use sudo in Dockerfiles",
                })

    # Policy 4: Must have a HEALTHCHECK instruction
    has_healthcheck = any(cmd.cmd.upper() == "HEALTHCHECK" for cmd in commands)
    if not has_healthcheck:
        violations.append({
            "line": 0,
            "rule": "HEALTHCHECK_REQUIRED",
            "message": "Dockerfile must include a HEALTHCHECK instruction",
        })

    # Policy 5: Must set a non-root USER
    has_user = any(
        cmd.cmd.upper() == "USER" and cmd.value[0] != "root"
        for cmd in commands
    )
    if not has_user:
        violations.append({
            "line": 0,
            "rule": "NON_ROOT_USER",
            "message": "Dockerfile must set a non-root USER",
        })

    return violations

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "Dockerfile"
    violations = check_compliance(path)

    if violations:
        print(f"Found {len(violations)} compliance violation(s):")
        for v in violations:
            print(f"  Line {v['line']}: [{v['rule']}] {v['message']}")
        sys.exit(1)
    else:
        print("All compliance checks passed")
        sys.exit(0)
```

## Parsing with Go - Moby's Dockerfile Parser

Docker itself is written in Go, and you can use the same parser that Docker uses internally.

A Go program that parses Dockerfiles:

```go
// main.go - Parse Dockerfiles using Docker's own parser
package main

import (
    "encoding/json"
    "fmt"
    "os"

    "github.com/moby/buildkit/frontend/dockerfile/parser"
)

type Instruction struct {
    Command  string   `json:"command"`
    Args     []string `json:"args"`
    Original string   `json:"original"`
    Line     int      `json:"line"`
}

func parseDockerfile(path string) ([]Instruction, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close()

    // Parse the Dockerfile into an AST
    result, err := parser.Parse(f)
    if err != nil {
        return nil, err
    }

    var instructions []Instruction

    // Walk the AST nodes
    for _, node := range result.AST.Children {
        inst := Instruction{
            Command:  node.Value,
            Original: node.Original,
            Line:     node.StartLine,
        }

        // Collect arguments
        for n := node.Next; n != nil; n = n.Next {
            inst.Args = append(inst.Args, n.Value)
        }

        instructions = append(instructions, inst)
    }

    return instructions, nil
}

func main() {
    path := "Dockerfile"
    if len(os.Args) > 1 {
        path = os.Args[1]
    }

    instructions, err := parseDockerfile(path)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }

    output, _ := json.MarshalIndent(instructions, "", "  ")
    fmt.Println(string(output))
}
```

Initialize and run the Go parser:

```bash
# Initialize a Go module and fetch dependencies
go mod init dockerfile-parser
go get github.com/moby/buildkit/frontend/dockerfile/parser

# Run the parser
go run main.go Dockerfile
```

## Extracting Package Information

One useful application of parsing is extracting which packages a Dockerfile installs.

Extract installed packages from apt-get and apk commands:

```python
# extract_packages.py - Extract package names from Dockerfiles
import dockerfile
import re
import sys

def extract_packages(path):
    """Extract all packages installed via apt-get or apk."""
    commands = dockerfile.parse_file(path)
    packages = {"apt": [], "apk": [], "pip": [], "npm": []}

    for cmd in commands:
        if cmd.cmd.upper() != "RUN":
            continue

        command_text = " ".join(cmd.value)

        # Extract apt-get install packages
        apt_match = re.findall(
            r"apt-get\s+install\s+(?:-\w+\s+)*(.+?)(?:&&|;|$)",
            command_text,
        )
        for match in apt_match:
            # Split and clean package names
            pkgs = [p.strip() for p in match.split() if not p.startswith("-")]
            packages["apt"].extend(pkgs)

        # Extract apk add packages
        apk_match = re.findall(
            r"apk\s+add\s+(?:--\w+\s+)*(.+?)(?:&&|;|$)",
            command_text,
        )
        for match in apk_match:
            pkgs = [p.strip() for p in match.split() if not p.startswith("-")]
            packages["apk"].extend(pkgs)

        # Extract pip install packages
        pip_match = re.findall(
            r"pip\s+install\s+(?:--\S+\s+)*(.+?)(?:&&|;|$)",
            command_text,
        )
        for match in pip_match:
            pkgs = [p.strip() for p in match.split() if not p.startswith("-")]
            packages["pip"].extend(pkgs)

    return packages

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "Dockerfile"
    pkgs = extract_packages(path)
    for manager, pkg_list in pkgs.items():
        if pkg_list:
            print(f"\n{manager.upper()} packages:")
            for pkg in sorted(set(pkg_list)):
                print(f"  - {pkg}")
```

## Generating Dockerfile Documentation

Automatically generate documentation from Dockerfile contents:

```python
# generate_docs.py - Generate markdown documentation from a Dockerfile
import dockerfile
import sys

def generate_docs(path):
    """Generate markdown documentation from a Dockerfile."""
    commands = dockerfile.parse_file(path)

    doc = []
    doc.append("# Dockerfile Documentation\n")

    # Document build stages
    stages = [c for c in commands if c.cmd.upper() == "FROM"]
    if len(stages) > 1:
        doc.append("## Build Stages\n")
        for i, stage in enumerate(stages):
            image = stage.value[0]
            name = stage.value[2] if len(stage.value) >= 3 else f"stage-{i}"
            doc.append(f"- **{name}**: Based on `{image}`")
        doc.append("")

    # Document exposed ports
    ports = [c for c in commands if c.cmd.upper() == "EXPOSE"]
    if ports:
        doc.append("## Exposed Ports\n")
        for port_cmd in ports:
            for port in port_cmd.value:
                doc.append(f"- `{port}`")
        doc.append("")

    # Document environment variables
    envs = [c for c in commands if c.cmd.upper() == "ENV"]
    if envs:
        doc.append("## Environment Variables\n")
        doc.append("| Variable | Default |")
        doc.append("|----------|---------|")
        for env in envs:
            text = " ".join(env.value)
            if "=" in text:
                key, value = text.split("=", 1)
                doc.append(f"| `{key}` | `{value}` |")
            else:
                parts = env.value
                if len(parts) >= 2:
                    doc.append(f"| `{parts[0]}` | `{parts[1]}` |")
        doc.append("")

    # Document volumes
    volumes = [c for c in commands if c.cmd.upper() == "VOLUME"]
    if volumes:
        doc.append("## Volumes\n")
        for vol in volumes:
            for v in vol.value:
                doc.append(f"- `{v}`")
        doc.append("")

    return "\n".join(doc)

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "Dockerfile"
    print(generate_docs(path))
```

## Integrating into CI

Run your custom Dockerfile analysis as a CI step:

```yaml
# .github/workflows/dockerfile-analysis.yml
name: Dockerfile Analysis

on:
  pull_request:
    paths:
      - "Dockerfile*"

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install dockerfile

      - name: Run compliance checks
        run: python scripts/compliance_check.py Dockerfile

      - name: Extract package list
        run: python scripts/extract_packages.py Dockerfile
```

## Summary

Programmatic Dockerfile parsing lets you build custom tooling tailored to your organization's specific needs. For quick checks, shell commands and grep patterns work fine. For structured analysis, the Python `dockerfile` library gives you clean access to every instruction. For deep integration with Docker internals, Go and the Moby parser offer the same parsing logic that Docker itself uses. Start with the simple approach and add complexity as your requirements grow.
