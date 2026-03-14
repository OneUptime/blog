# Parsing Output from Cilium Agent Hive Dot-Graph

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Hive, Graphviz, Parsing, Python, Automation

Description: Learn how to parse DOT-format output from cilium-agent hive dot-graph to extract component relationships, compute graph metrics, and generate structured reports.

---

## Introduction

The `cilium-agent hive dot-graph` command produces DOT-format output that encodes the full dependency graph of the Cilium agent. While this format is designed for rendering with Graphviz, it is also a structured data source that can be parsed to extract component inventories, dependency chains, and architectural metrics.

Parsing the DOT output programmatically lets you integrate dependency analysis into automated pipelines, generate JSON reports for dashboards, and perform graph-theoretic analysis to identify critical components and potential single points of failure.

## Prerequisites

- A captured cilium-agent hive dot-graph output file
- Python 3.x
- `grep`, `awk`, `sed` for shell parsing
- Optional: `networkx` Python library for graph analysis

## Shell-Based DOT Parsing

Extract basic information using standard Unix tools:

```bash
#!/bin/bash
# parse-dot-basic.sh
# Extract nodes and edges from a DOT file

DOT_FILE="${1:-/tmp/cilium-hive.dot}"

echo "=== Node List ==="
grep -oP '"([^"]+)"\s*\[label="([^"]+)"' "$DOT_FILE" | \
  sed 's/"//g;s/\s*\[label=/ => /' | sort

echo ""
echo "=== Edge List ==="
grep -oP '"([^"]+)"\s*->\s*"([^"]+)"' "$DOT_FILE" | \
  sed 's/"//g;s/ -> / => /' | sort

echo ""
echo "=== Summary ==="
NODES=$(grep -c '\[label=' "$DOT_FILE" 2>/dev/null || echo 0)
EDGES=$(grep -c '\->' "$DOT_FILE" 2>/dev/null || echo 0)
echo "Nodes: $NODES"
echo "Edges: $EDGES"
echo "Average edges per node: $(echo "scale=1; $EDGES / $NODES" | bc 2>/dev/null || echo "N/A")"
```

## Python DOT Parser with Graph Analysis

```python
#!/usr/bin/env python3
"""
Parse cilium-agent hive dot-graph output and perform graph analysis.
Outputs structured JSON with component metrics.
"""

import re
import json
import sys
from collections import defaultdict

def parse_dot(filepath):
    """Parse a DOT file into nodes and edges."""
    with open(filepath) as f:
        content = f.read()

    nodes = {}
    edges = []

    # Extract nodes with labels
    for match in re.finditer(r'"([^"]+)"\s*\[label="([^"]+)"', content):
        node_id, label = match.group(1), match.group(2)
        nodes[node_id] = label

    # Extract edges
    for match in re.finditer(r'"([^"]+)"\s*->\s*"([^"]+)"', content):
        edges.append((match.group(1), match.group(2)))

    return nodes, edges

def compute_metrics(nodes, edges):
    """Compute graph metrics for dependency analysis."""
    in_degree = defaultdict(int)
    out_degree = defaultdict(int)
    adj = defaultdict(set)
    rev_adj = defaultdict(set)

    for src, dst in edges:
        out_degree[src] += 1
        in_degree[dst] += 1
        adj[src].add(dst)
        rev_adj[dst].add(src)

    # Find root nodes (no incoming edges)
    all_nodes = set(nodes.keys())
    targets = {dst for _, dst in edges}
    sources = {src for src, _ in edges}
    roots = sources - targets

    # Find leaf nodes (no outgoing edges)
    leaves = targets - sources

    # Compute longest dependency chain using DFS
    def longest_path(node, memo={}):
        if node in memo:
            return memo[node]
        if not adj[node]:
            memo[node] = 0
            return 0
        depth = max(longest_path(child, memo) for child in adj[node]) + 1
        memo[node] = depth
        return depth

    max_depth = 0
    deepest_root = None
    for root in roots:
        d = longest_path(root)
        if d > max_depth:
            max_depth = d
            deepest_root = root

    # Find most critical nodes (highest combined degree)
    critical = sorted(
        all_nodes,
        key=lambda n: in_degree[n] + out_degree[n],
        reverse=True
    )[:10]

    return {
        'total_nodes': len(nodes),
        'total_edges': len(edges),
        'root_components': [nodes.get(r, r) for r in roots],
        'leaf_components': [nodes.get(l, l) for l in leaves],
        'max_dependency_depth': max_depth,
        'deepest_chain_root': nodes.get(deepest_root, deepest_root),
        'most_critical': [
            {
                'name': nodes.get(n, n),
                'in_degree': in_degree[n],
                'out_degree': out_degree[n]
            }
            for n in critical
        ]
    }

if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else '/tmp/cilium-hive.dot'
    nodes, edges = parse_dot(filepath)
    metrics = compute_metrics(nodes, edges)
    print(json.dumps(metrics, indent=2))
```

```bash
python3 parse_dot_graph.py /tmp/cilium-hive.dot
```

## Converting to Adjacency List Format

For integration with other graph tools:

```bash
#!/bin/bash
# dot-to-adjacency.sh
# Convert DOT to adjacency list format

DOT_FILE="${1:-/tmp/cilium-hive.dot}"

echo "# Adjacency list: node -> [dependencies]"
grep -oP '"([^"]+)"\s*->\s*"([^"]+)"' "$DOT_FILE" | \
  sed 's/"//g;s/ -> /\t/' | \
  awk -F'\t' '{
    adj[$1] = adj[$1] ? adj[$1] "," $2 : $2
  }
  END {
    for (node in adj) {
      print node " -> [" adj[node] "]"
    }
  }' | sort
```

## Generating JSON Reports for Dashboards

```bash
#!/bin/bash
# dot-to-json-report.sh
# Generate a JSON report from dot-graph for dashboard consumption

DOT_FILE="${1:-/tmp/cilium-hive.dot}"

NODES=$(grep -c '\[label=' "$DOT_FILE" 2>/dev/null || echo 0)
EDGES=$(grep -c '\->' "$DOT_FILE" 2>/dev/null || echo 0)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Extract node list as JSON array
NODE_LIST=$(grep -oP 'label="\K[^"]+' "$DOT_FILE" | \
  jq -R . | jq -s .)

cat << JSONEOF
{
  "timestamp": "$TIMESTAMP",
  "total_components": $NODES,
  "total_dependencies": $EDGES,
  "components": $NODE_LIST
}
JSONEOF
```

## Verification

```bash
# Verify shell parser
bash parse-dot-basic.sh /tmp/cilium-hive.dot

# Verify Python parser produces valid JSON
python3 parse_dot_graph.py /tmp/cilium-hive.dot | jq . > /dev/null && \
  echo "Valid JSON output"

# Verify adjacency list conversion
bash dot-to-adjacency.sh /tmp/cilium-hive.dot | head -10

# Verify JSON report
bash dot-to-json-report.sh /tmp/cilium-hive.dot | jq .total_components
```

## Troubleshooting

- **Regex mismatches**: DOT formatting can vary. Check the raw file and adjust patterns for your Cilium version.
- **Python script finds zero nodes**: The node definition format may differ. Print the first 20 lines of the DOT file and adjust the regex.
- **jq errors in JSON generation**: Ensure node labels do not contain unescaped quotes. Preprocess with `sed 's/"/\\"/g'`.
- **Graph metrics report cycles**: The hive dependency graph should be a DAG. Cycles indicate a bug -- report to the Cilium project.

## Conclusion

Parsing the DOT output from `cilium-agent hive dot-graph` gives you programmatic access to the agent's full dependency structure. From simple shell extraction to Python-based graph analysis, these techniques enable automated reporting, dashboard integration, and architectural analysis that scales with your Cilium deployment.
