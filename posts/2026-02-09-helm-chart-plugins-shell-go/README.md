# How to Build Helm Chart Plugins Using Shell Scripts and Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Go

Description: Learn how to extend Helm functionality by building custom plugins using shell scripts and Go, enabling workflow automation and adding new capabilities to your Helm CLI.

---

Helm provides a plugin system that allows you to extend its functionality beyond the built-in commands. Whether you need custom chart validation, specialized deployment workflows, or integration with other tools, plugins enable you to tailor Helm to your specific requirements. You can build plugins using simple shell scripts for quick solutions or Go for more sophisticated functionality.

## Understanding Helm Plugins

Helm plugins are executable programs that integrate seamlessly with the Helm CLI. When you run `helm <plugin-name>`, Helm locates the plugin in your plugin directory and executes it. Plugins receive access to Helm's environment variables, allowing them to interact with charts, releases, and Kubernetes clusters.

The plugin system is flexible and supports any programming language, but shell scripts and Go are the most common choices. Shell scripts work well for simple automation tasks, while Go provides better performance and access to Helm's internal libraries.

## Plugin Directory Structure

Every Helm plugin follows a standard structure:

```
helm-myplugin/
├── plugin.yaml          # Plugin metadata and configuration
├── myplugin.sh          # Main executable (shell script)
└── README.md            # Documentation
```

For Go-based plugins, the structure is similar:

```
helm-myplugin/
├── plugin.yaml
├── main.go              # Go source code
├── go.mod
├── go.sum
├── scripts/
│   └── install-plugin.sh
└── README.md
```

## Creating a Simple Shell Script Plugin

Let's build a plugin that lists all releases with their resource counts. Create the plugin directory:

```bash
mkdir -p ~/.local/share/helm/plugins/helm-release-info
cd ~/.local/share/helm/plugins/helm-release-info
```

Create the `plugin.yaml` file:

```yaml
name: "release-info"
version: "0.1.0"
usage: "Display detailed information about releases"
description: "Shows release information with resource counts"
command: "$HELM_PLUGIN_DIR/release-info.sh"
```

Create the executable script `release-info.sh`:

```bash
#!/bin/bash
# Helm plugin to display release information with resource counts

set -e

# Check if namespace is provided
NAMESPACE="${1:-default}"

echo "Release Information for namespace: $NAMESPACE"
echo "================================================"

# Get all releases in the namespace
RELEASES=$(helm list -n "$NAMESPACE" -q)

if [ -z "$RELEASES" ]; then
    echo "No releases found in namespace $NAMESPACE"
    exit 0
fi

# Iterate through each release
for release in $RELEASES; do
    echo ""
    echo "Release: $release"

    # Get release info
    helm get manifest "$release" -n "$NAMESPACE" | \
        grep "^kind:" | \
        sort | \
        uniq -c | \
        awk '{print "  " $2 ": " $1}'

    # Get release status
    STATUS=$(helm status "$release" -n "$NAMESPACE" -o json | jq -r '.info.status')
    echo "  Status: $STATUS"

    # Get chart version
    CHART=$(helm list -n "$NAMESPACE" -f "^${release}$" -o json | jq -r '.[0].chart')
    echo "  Chart: $CHART"
done

echo ""
echo "================================================"
echo "Total releases: $(echo "$RELEASES" | wc -l)"
```

Make it executable and test:

```bash
chmod +x release-info.sh
helm release-info default
```

## Building an Advanced Shell Plugin with Options

Create a more sophisticated plugin that validates chart security best practices:

```bash
#!/bin/bash
# Helm plugin for security validation

PLUGIN_NAME="security-check"
CHART_PATH=""
VERBOSE=false

show_help() {
    cat << EOF
Usage: helm security-check [OPTIONS] CHART

Validates Helm charts against security best practices.

Options:
    -v, --verbose    Show detailed output
    -h, --help       Display this help message

Examples:
    helm security-check ./my-chart
    helm security-check -v ./my-chart
EOF
}

log() {
    if [ "$VERBOSE" = true ]; then
        echo "[INFO] $1"
    fi
}

error() {
    echo "[ERROR] $1" >&2
}

check_security_context() {
    log "Checking security context configurations..."

    local issues=0

    # Check for runAsNonRoot
    if ! grep -r "runAsNonRoot: true" "$CHART_PATH/templates" > /dev/null 2>&1; then
        error "Missing runAsNonRoot: true in pod security context"
        ((issues++))
    fi

    # Check for readOnlyRootFilesystem
    if ! grep -r "readOnlyRootFilesystem: true" "$CHART_PATH/templates" > /dev/null 2>&1; then
        error "Missing readOnlyRootFilesystem: true in container security context"
        ((issues++))
    fi

    # Check for privilege escalation
    if grep -r "allowPrivilegeEscalation: true" "$CHART_PATH/templates" > /dev/null 2>&1; then
        error "Found allowPrivilegeEscalation: true (should be false)"
        ((issues++))
    fi

    return $issues
}

check_resource_limits() {
    log "Checking resource limits..."

    local issues=0

    # Check if resources are defined
    if ! grep -r "resources:" "$CHART_PATH/templates" > /dev/null 2>&1; then
        error "No resource limits defined"
        ((issues++))
    fi

    return $issues
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            CHART_PATH="$1"
            shift
            ;;
    esac
done

# Validate chart path
if [ -z "$CHART_PATH" ]; then
    error "Chart path is required"
    show_help
    exit 1
fi

if [ ! -d "$CHART_PATH" ]; then
    error "Chart directory not found: $CHART_PATH"
    exit 1
fi

echo "Running security checks on: $CHART_PATH"
echo ""

total_issues=0

check_security_context
total_issues=$((total_issues + $?))

check_resource_limits
total_issues=$((total_issues + $?))

echo ""
if [ $total_issues -eq 0 ]; then
    echo "✓ All security checks passed!"
    exit 0
else
    echo "✗ Found $total_issues security issues"
    exit 1
fi
```

## Building a Go-Based Plugin

Go plugins provide better performance and access to Helm's libraries. Create a new Go plugin:

```bash
mkdir -p helm-chart-analyzer
cd helm-chart-analyzer
go mod init github.com/yourusername/helm-chart-analyzer
```

Create `main.go`:

```go
package main

import (
    "fmt"
    "os"
    "path/filepath"

    "github.com/spf13/cobra"
    "helm.sh/helm/v3/pkg/action"
    "helm.sh/helm/v3/pkg/cli"
    "helm.sh/helm/v3/pkg/chart/loader"
)

var (
    settings = cli.New()
    verbose  bool
)

func main() {
    cmd := &cobra.Command{
        Use:   "chart-analyzer [CHART]",
        Short: "Analyze Helm chart structure and complexity",
        Args:  cobra.ExactArgs(1),
        RunE:  runAnalyze,
    }

    flags := cmd.Flags()
    flags.BoolVarP(&verbose, "verbose", "v", false, "verbose output")

    if err := cmd.Execute(); err != nil {
        os.Exit(1)
    }
}

func runAnalyze(cmd *cobra.Command, args []string) error {
    chartPath := args[0]

    // Load the chart
    chart, err := loader.Load(chartPath)
    if err != nil {
        return fmt.Errorf("failed to load chart: %w", err)
    }

    fmt.Printf("Chart Analysis: %s\n", chart.Name())
    fmt.Printf("Version: %s\n", chart.Metadata.Version)
    fmt.Printf("Type: %s\n", chart.Metadata.Type)
    fmt.Println()

    // Count templates
    templateCount := len(chart.Templates)
    fmt.Printf("Templates: %d\n", templateCount)

    if verbose {
        fmt.Println("\nTemplate files:")
        for _, tmpl := range chart.Templates {
            fmt.Printf("  - %s (%d bytes)\n", tmpl.Name, len(tmpl.Data))
        }
    }

    // Analyze dependencies
    if len(chart.Metadata.Dependencies) > 0 {
        fmt.Printf("\nDependencies: %d\n", len(chart.Metadata.Dependencies))
        for _, dep := range chart.Metadata.Dependencies {
            fmt.Printf("  - %s (%s)\n", dep.Name, dep.Version)
        }
    }

    // Analyze values
    if chart.Values != nil {
        fmt.Println("\nValues structure:")
        analyzeValues(chart.Values, "  ")
    }

    // Calculate complexity score
    complexity := calculateComplexity(chart)
    fmt.Printf("\nComplexity Score: %d\n", complexity)

    return nil
}

func analyzeValues(values map[string]interface{}, indent string) {
    for key, value := range values {
        switch v := value.(type) {
        case map[string]interface{}:
            fmt.Printf("%s%s: (object)\n", indent, key)
            analyzeValues(v, indent+"  ")
        case []interface{}:
            fmt.Printf("%s%s: (array, %d items)\n", indent, key, len(v))
        default:
            fmt.Printf("%s%s: %T\n", indent, key, value)
        }
    }
}

func calculateComplexity(chart *chart.Chart) int {
    score := 0

    // Base score from template count
    score += len(chart.Templates) * 5

    // Dependencies add complexity
    score += len(chart.Metadata.Dependencies) * 10

    // Count total lines in templates
    for _, tmpl := range chart.Templates {
        score += len(tmpl.Data) / 100
    }

    return score
}
```

Create the `plugin.yaml`:

```yaml
name: "chart-analyzer"
version: "0.1.0"
usage: "Analyze Helm chart structure and complexity"
description: "Provides detailed analysis of chart templates, dependencies, and complexity"
command: "$HELM_PLUGIN_DIR/chart-analyzer"
hooks:
  install: "cd $HELM_PLUGIN_DIR && scripts/install-plugin.sh"
```

Create the installation script `scripts/install-plugin.sh`:

```bash
#!/bin/bash

set -e

cd "$HELM_PLUGIN_DIR"

if [ -n "$HELM_PLUGIN_DIR" ]; then
    # Build the plugin
    echo "Building plugin..."
    go build -o chart-analyzer main.go

    echo "Plugin installed successfully!"
else
    echo "Error: HELM_PLUGIN_DIR not set"
    exit 1
fi
```

## Installing and Testing Plugins

Install your plugin:

```bash
# From local directory
helm plugin install ./helm-chart-analyzer

# From git repository
helm plugin install https://github.com/yourusername/helm-chart-analyzer

# List installed plugins
helm plugin list

# Use the plugin
helm chart-analyzer ./my-chart -v
```

## Plugin Environment Variables

Helm provides several environment variables to plugins:

```bash
#!/bin/bash

echo "Helm Plugin Directory: $HELM_PLUGIN_DIR"
echo "Helm Plugin Name: $HELM_PLUGIN_NAME"
echo "Helm Binary: $HELM_BIN"
echo "Helm Registry Config: $HELM_REGISTRY_CONFIG"
echo "Helm Repository Config: $HELM_REPOSITORY_CONFIG"
echo "Helm Repository Cache: $HELM_REPOSITORY_CACHE"
echo "Helm Namespace: $HELM_NAMESPACE"
echo "Kubeconfig: $KUBECONFIG"
```

## Distributing Plugins

Package your plugin for distribution:

```bash
# Create a release archive
tar -czf helm-chart-analyzer-v0.1.0.tar.gz helm-chart-analyzer/

# Publish to GitHub releases
gh release create v0.1.0 helm-chart-analyzer-v0.1.0.tar.gz
```

Users can install directly from the release:

```bash
helm plugin install https://github.com/yourusername/helm-chart-analyzer/releases/download/v0.1.0/helm-chart-analyzer-v0.1.0.tar.gz
```

Helm plugins unlock powerful customization capabilities, allowing you to build tools that integrate seamlessly with your deployment workflows. Whether you choose shell scripts for simplicity or Go for performance, plugins extend Helm to match your exact requirements.
