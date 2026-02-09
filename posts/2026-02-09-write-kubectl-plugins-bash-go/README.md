# How to Write kubectl Plugins from Scratch in Bash and Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Plugin Development

Description: Learn how to create custom kubectl plugins in Bash and Go to extend kubectl functionality with your own commands and automate cluster management workflows.

---

kubectl plugins let you add custom subcommands without modifying kubectl itself. Any executable named `kubectl-something` in your PATH becomes available as `kubectl something`. This simple mechanism enables powerful extensions using shell scripts or compiled programs.

## How kubectl Plugins Work

kubectl searches your PATH for executables matching `kubectl-*`. When you run `kubectl foo`, it looks for `kubectl-foo` and executes it with any additional arguments passed through.

```bash
# Create a simple plugin
cat > kubectl-hello << 'EOF'
#!/bin/bash
echo "Hello from kubectl plugin!"
EOF

chmod +x kubectl-hello
mv kubectl-hello /usr/local/bin/

# Run the plugin
kubectl hello
# Output: Hello from kubectl plugin!
```

That's the complete plugin mechanism. Everything else is standard shell scripting or programming.

## Basic Bash Plugin Structure

Start with a template that handles arguments and provides help:

```bash
#!/bin/bash
# kubectl-example - Example kubectl plugin

set -e

# Help text
show_help() {
    cat << EOF
kubectl-example - Example plugin demonstrating basic structure

Usage:
  kubectl example [flags]

Flags:
  -h, --help     Show this help message
  -n, --namespace <namespace>  Target namespace (default: current context)

Examples:
  kubectl example
  kubectl example -n production
EOF
}

# Parse arguments
NAMESPACE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main logic
main() {
    local ns_flag=""
    if [[ -n "$NAMESPACE" ]]; then
        ns_flag="-n $NAMESPACE"
    fi

    kubectl get pods $ns_flag
}

main
```

This template provides help text, argument parsing, and namespace support.

## Building a Pod Summary Plugin

Create a plugin that summarizes pod status across namespaces:

```bash
#!/bin/bash
# kubectl-pod-summary - Show pod status summary

set -e

show_help() {
    cat << EOF
kubectl-pod-summary - Display pod status summary

Usage:
  kubectl pod-summary [namespace]

Arguments:
  namespace    Optional namespace (default: all namespaces)

Examples:
  kubectl pod-summary
  kubectl pod-summary production
EOF
}

# Check for help flag
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Determine namespace
NS_FLAG="--all-namespaces"
if [[ -n "$1" ]]; then
    NS_FLAG="-n $1"
fi

# Get pod data
echo "Pod Status Summary"
echo "=================="

# Count by status
kubectl get pods $NS_FLAG --no-headers | awk '{print $3}' | sort | uniq -c | while read count status; do
    printf "%-20s: %d\n" "$status" "$count"
done

echo ""
echo "Total Pods: $(kubectl get pods $NS_FLAG --no-headers | wc -l)"

# Show pods with restarts
echo ""
echo "Pods with Restarts:"
kubectl get pods $NS_FLAG -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount --no-headers | awk '$2 > 0 {print}'
```

This plugin combines multiple kubectl calls and formatting to create a useful status overview.

## Creating a Node Drain Helper

Build a plugin that safely drains nodes with confirmation:

```bash
#!/bin/bash
# kubectl-drain-safe - Safe node draining with confirmation

set -e

show_help() {
    cat << EOF
kubectl-drain-safe - Drain node with confirmation and safety checks

Usage:
  kubectl drain-safe <node-name> [flags]

Flags:
  --force              Skip confirmation prompt
  --ignore-daemonsets  Ignore DaemonSet-managed pods
  --delete-local-data  Delete pods with local storage

Examples:
  kubectl drain-safe worker-1
  kubectl drain-safe worker-2 --force --ignore-daemonsets
EOF
}

if [[ $# -lt 1 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 1
fi

NODE=$1
shift

FORCE=false
DRAIN_FLAGS=""

# Parse flags
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --ignore-daemonsets)
            DRAIN_FLAGS="$DRAIN_FLAGS --ignore-daemonsets"
            shift
            ;;
        --delete-local-data)
            DRAIN_FLAGS="$DRAIN_FLAGS --delete-emptydir-data"
            shift
            ;;
        *)
            echo "Unknown flag: $1"
            exit 1
            ;;
    esac
done

# Check if node exists
if ! kubectl get node "$NODE" &>/dev/null; then
    echo "Error: Node $NODE not found"
    exit 1
fi

# Show pods on the node
echo "Pods running on $NODE:"
kubectl get pods --all-namespaces --field-selector spec.nodeName="$NODE" -o wide

# Confirmation unless forced
if [[ "$FORCE" != "true" ]]; then
    echo ""
    read -p "Drain node $NODE? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Cancelled"
        exit 0
    fi
fi

# Drain the node
echo "Draining node $NODE..."
kubectl drain "$NODE" $DRAIN_FLAGS

echo "Node $NODE drained successfully"
```

This plugin adds safety checks and user confirmation to prevent accidental node drains.

## Writing Plugins in Go

Go provides better performance and easier distribution. Here's a basic Go plugin structure:

```go
// kubectl-podinfo.go
package main

import (
    "context"
    "flag"
    "fmt"
    "os"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Define flags
    namespace := flag.String("namespace", "default", "Target namespace")
    kubeconfig := flag.String("kubeconfig", "", "Path to kubeconfig file")
    flag.Parse()

    // Get pod name from arguments
    if flag.NArg() < 1 {
        fmt.Println("Usage: kubectl podinfo <pod-name>")
        os.Exit(1)
    }
    podName := flag.Arg(0)

    // Load kubeconfig
    if *kubeconfig == "" {
        *kubeconfig = os.Getenv("KUBECONFIG")
        if *kubeconfig == "" {
            home, _ := os.UserHomeDir()
            *kubeconfig = home + "/.kube/config"
        }
    }

    config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
    if err != nil {
        fmt.Printf("Error loading kubeconfig: %v\n", err)
        os.Exit(1)
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        fmt.Printf("Error creating client: %v\n", err)
        os.Exit(1)
    }

    // Get pod
    pod, err := clientset.CoreV1().Pods(*namespace).Get(context.TODO(), podName, metav1.GetOptions{})
    if err != nil {
        fmt.Printf("Error getting pod: %v\n", err)
        os.Exit(1)
    }

    // Display pod information
    fmt.Printf("Pod: %s\n", pod.Name)
    fmt.Printf("Namespace: %s\n", pod.Namespace)
    fmt.Printf("Status: %s\n", pod.Status.Phase)
    fmt.Printf("Node: %s\n", pod.Spec.NodeName)
    fmt.Printf("IP: %s\n", pod.Status.PodIP)

    fmt.Println("\nContainers:")
    for _, container := range pod.Spec.Containers {
        fmt.Printf("  - %s: %s\n", container.Name, container.Image)
    }
}
```

Build and install the plugin:

```bash
# Initialize Go module
go mod init kubectl-podinfo
go mod tidy

# Build the plugin
go build -o kubectl-podinfo kubectl-podinfo.go

# Install to PATH
mv kubectl-podinfo /usr/local/bin/

# Use the plugin
kubectl podinfo nginx-pod -namespace=production
```

## Advanced Go Plugin with Tables

Create formatted table output using client-go printer utilities:

```go
// kubectl-resource-summary.go
package main

import (
    "context"
    "flag"
    "fmt"
    "os"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

type ResourceCount struct {
    ResourceType string
    Count        int
}

func main() {
    namespace := flag.String("namespace", "", "Target namespace (default: all namespaces)")
    flag.Parse()

    kubeconfig := os.Getenv("KUBECONFIG")
    if kubeconfig == "" {
        home, _ := os.UserHomeDir()
        kubeconfig = home + "/.kube/config"
    }

    config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        os.Exit(1)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        os.Exit(1)
    }

    ctx := context.TODO()
    listOpts := metav1.ListOptions{}

    // Count resources
    var counts []ResourceCount

    // Pods
    pods, _ := clientset.CoreV1().Pods(*namespace).List(ctx, listOpts)
    counts = append(counts, ResourceCount{"Pods", len(pods.Items)})

    // Services
    services, _ := clientset.CoreV1().Services(*namespace).List(ctx, listOpts)
    counts = append(counts, ResourceCount{"Services", len(services.Items)})

    // Deployments
    deployments, _ := clientset.AppsV1().Deployments(*namespace).List(ctx, listOpts)
    counts = append(counts, ResourceCount{"Deployments", len(deployments.Items)})

    // ConfigMaps
    configmaps, _ := clientset.CoreV1().ConfigMaps(*namespace).List(ctx, listOpts)
    counts = append(counts, ResourceCount{"ConfigMaps", len(configmaps.Items)})

    // Secrets
    secrets, _ := clientset.CoreV1().Secrets(*namespace).List(ctx, listOpts)
    counts = append(counts, ResourceCount{"Secrets", len(secrets.Items)})

    // Print summary
    nsText := "all namespaces"
    if *namespace != "" {
        nsText = "namespace: " + *namespace
    }

    fmt.Printf("Resource Summary (%s)\n", nsText)
    fmt.Println("========================================")
    fmt.Printf("%-20s %10s\n", "RESOURCE", "COUNT")
    fmt.Println("----------------------------------------")

    for _, rc := range counts {
        fmt.Printf("%-20s %10d\n", rc.ResourceType, rc.Count)
    }
}
```

This plugin demonstrates working with multiple resource types and formatted output.

## Plugin Distribution with Krew

Package your plugin for distribution through Krew:

```yaml
# kubectl-podinfo.yaml
apiVersion: krew.googlecontainertools.github.com/v1alpha2
kind: Plugin
metadata:
  name: podinfo
spec:
  version: v1.0.0
  homepage: https://github.com/yourusername/kubectl-podinfo
  shortDescription: Display detailed pod information
  description: |
    kubectl-podinfo shows detailed information about a pod including
    containers, status, and resource usage.
  platforms:
  - selector:
      matchLabels:
        os: linux
        arch: amd64
    uri: https://github.com/yourusername/kubectl-podinfo/releases/download/v1.0.0/kubectl-podinfo-linux-amd64.tar.gz
    sha256: "abc123..."
    bin: kubectl-podinfo
  - selector:
      matchLabels:
        os: darwin
        arch: amd64
    uri: https://github.com/yourusername/kubectl-podinfo/releases/download/v1.0.0/kubectl-podinfo-darwin-amd64.tar.gz
    sha256: "def456..."
    bin: kubectl-podinfo
```

Submit this manifest to the Krew index repository to make your plugin discoverable.

## Testing Plugins

Test plugins in isolated environments:

```bash
# Create test script
cat > test-plugin.sh << 'EOF'
#!/bin/bash
# Test kubectl plugin

# Set up test PATH
export PATH="./bin:$PATH"

# Test basic execution
./kubectl-example --help

# Test with arguments
./kubectl-example -n default

echo "Tests passed"
EOF

chmod +x test-plugin.sh
./test-plugin.sh
```

For Go plugins, use standard Go testing:

```go
// kubectl-podinfo_test.go
package main

import (
    "testing"
)

func TestPodInfoBasic(t *testing.T) {
    // Test basic functionality
    // Add test cases here
}
```

## Plugin Best Practices

Follow these guidelines for professional plugins:

1. Provide comprehensive help text with `-h` and `--help` flags
2. Accept standard kubectl flags like `-n/--namespace`
3. Respect KUBECONFIG environment variable
4. Use exit codes: 0 for success, non-zero for errors
5. Provide clear error messages
6. Support both short and long flag formats
7. Document examples in help text

```bash
# Good plugin behavior
kubectl myplugin --help  # Shows detailed help
kubectl myplugin -n production  # Respects namespace flag
kubectl myplugin invalid-arg  # Shows clear error and exits non-zero
```

## Performance Considerations

Bash plugins execute quickly for simple operations but slow down with complex processing. Go plugins start faster and handle large data sets better:

```bash
# Bash - fast for simple kubectl calls
time kubectl bash-plugin  # ~100ms

# Go - compiled, faster execution
time kubectl go-plugin  # ~50ms
```

Choose Bash for simple wrappers, Go for complex logic and data processing.

Plugins extend kubectl without waiting for upstream feature additions. Write custom commands that match your workflow, automate repetitive tasks, and share tools across your team. Start with simple Bash scripts and graduate to Go when you need more power. For plugin discovery and installation, see https://oneuptime.com/blog/post/kubectl-plugins-krew-package-manager/view.
