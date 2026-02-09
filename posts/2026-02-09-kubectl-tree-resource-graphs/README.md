# How to Build Custom Kubernetes Resource Viewers Using kubectl Tree and Resource Graphs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubectl, Visualization, DevOps, CLI

Description: Build custom resource viewers using kubectl tree and relationship graphs to visualize complex Kubernetes object hierarchies and understand dependencies between resources.

---

Understanding relationships between Kubernetes resources becomes challenging as applications grow in complexity. A deployment creates a replica set, which creates pods, which use config maps and secrets, which are exposed by services. Visualizing these hierarchies makes troubleshooting and understanding system architecture significantly easier.

Kubectl tree and custom resource graph tools provide tree-based views of resource relationships. This guide shows you how to use these tools and build custom visualizations tailored to your specific needs.

## Installing kubectl tree

Install the kubectl tree plugin using Krew:

```bash
kubectl krew install tree
```

Or install directly from source:

```bash
# Clone repository
git clone https://github.com/ahmetb/kubectl-tree.git
cd kubectl-tree

# Build and install
make
sudo cp kubectl-tree /usr/local/bin/
```

## Basic kubectl tree Usage

View the complete hierarchy of a deployment:

```bash
kubectl tree deployment nginx
```

Output shows the full resource tree:

```
NAMESPACE  NAME                                   READY  REASON  AGE
default    Deployment/nginx                       -              5d
default    └─ReplicaSet/nginx-7c5ddbdf54          -              5d
default      ├─Pod/nginx-7c5ddbdf54-2xhqw         True           5d
default      ├─Pod/nginx-7c5ddbdf54-7kznj         True           5d
default      └─Pod/nginx-7c5ddbdf54-qmwvx         True           5d
```

View resources across namespaces:

```bash
kubectl tree deployment nginx -n production
```

Show only specific resource types:

```bash
kubectl tree deployment nginx --only pod,configmap
```

## Visualizing Service Relationships

Map out all resources connected to a service:

```bash
# View service and its endpoints
kubectl tree service api

# Example output:
# NAMESPACE  NAME              READY  REASON  AGE
# default    Service/api       -              10d
# default    └─EndpointSlice/api-abc123  -    10d
```

Create a script to show complete service topology:

```bash
#!/bin/bash
# service-topology.sh

SERVICE=$1
NAMESPACE=${2:-default}

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service-name> [namespace]"
    exit 1
fi

echo "Service Topology for $SERVICE"
echo "=============================="

# Get service
echo "Service:"
kubectl get svc -n "$NAMESPACE" "$SERVICE" -o wide

echo ""
echo "Endpoints:"
kubectl get endpoints -n "$NAMESPACE" "$SERVICE"

echo ""
echo "Pods backing this service:"
SELECTOR=$(kubectl get svc -n "$NAMESPACE" "$SERVICE" -o jsonpath='{.spec.selector}' | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')

if [ -n "$SELECTOR" ]; then
    kubectl get pods -n "$NAMESPACE" -l "$SELECTOR"

    echo ""
    echo "Resource Tree:"
    # Find deployments/statefulsets with matching labels
    for kind in deployment statefulset daemonset; do
        RESOURCES=$(kubectl get "$kind" -n "$NAMESPACE" -l "$SELECTOR" -o name 2>/dev/null)
        if [ -n "$RESOURCES" ]; then
            for resource in $RESOURCES; do
                kubectl tree "$resource" -n "$NAMESPACE"
            done
        fi
    done
fi
```

Run it:

```bash
chmod +x service-topology.sh
./service-topology.sh api production
```

## Building Custom Resource Relationship Graphs

Create a tool that generates resource relationship graphs:

```go
// resource-graph.go
package main

import (
    "context"
    "fmt"
    "os"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

type ResourceNode struct {
    Kind      string
    Name      string
    Namespace string
    Children  []*ResourceNode
}

func main() {
    if len(os.Args) < 3 {
        fmt.Println("Usage: resource-graph <resource-type> <resource-name> [namespace]")
        os.Exit(1)
    }

    resourceType := os.Args[1]
    resourceName := os.Args[2]
    namespace := "default"
    if len(os.Args) > 3 {
        namespace = os.Args[3]
    }

    clientset, err := getKubernetesClient()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error creating client: %v\n", err)
        os.Exit(1)
    }

    tree, err := buildResourceTree(clientset, resourceType, resourceName, namespace)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error building tree: %v\n", err)
        os.Exit(1)
    }

    printTree(tree, "", true)
}

func getKubernetesClient() (*kubernetes.Clientset, error) {
    loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
    configOverrides := &clientcmd.ConfigOverrides{}
    kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

    config, err := kubeConfig.ClientConfig()
    if err != nil {
        return nil, err
    }

    return kubernetes.NewForConfig(config)
}

func buildResourceTree(clientset *kubernetes.Clientset, kind, name, namespace string) (*ResourceNode, error) {
    ctx := context.Background()
    node := &ResourceNode{
        Kind:      kind,
        Name:      name,
        Namespace: namespace,
        Children:  []*ResourceNode{},
    }

    switch kind {
    case "deployment":
        // Get replica sets owned by deployment
        replicaSets, err := clientset.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{})
        if err != nil {
            return nil, err
        }

        for _, rs := range replicaSets.Items {
            for _, owner := range rs.OwnerReferences {
                if owner.Kind == "Deployment" && owner.Name == name {
                    rsNode, err := buildResourceTree(clientset, "replicaset", rs.Name, namespace)
                    if err != nil {
                        return nil, err
                    }
                    node.Children = append(node.Children, rsNode)
                }
            }
        }

    case "replicaset":
        // Get pods owned by replica set
        pods, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
        if err != nil {
            return nil, err
        }

        for _, pod := range pods.Items {
            for _, owner := range pod.OwnerReferences {
                if owner.Kind == "ReplicaSet" && owner.Name == name {
                    podNode := &ResourceNode{
                        Kind:      "pod",
                        Name:      pod.Name,
                        Namespace: namespace,
                        Children:  []*ResourceNode{},
                    }

                    // Add config maps and secrets used by pod
                    for _, volume := range pod.Spec.Volumes {
                        if volume.ConfigMap != nil {
                            podNode.Children = append(podNode.Children, &ResourceNode{
                                Kind:      "configmap",
                                Name:      volume.ConfigMap.Name,
                                Namespace: namespace,
                            })
                        }
                        if volume.Secret != nil {
                            podNode.Children = append(podNode.Children, &ResourceNode{
                                Kind:      "secret",
                                Name:      volume.Secret.SecretName,
                                Namespace: namespace,
                            })
                        }
                    }

                    node.Children = append(node.Children, podNode)
                }
            }
        }
    }

    return node, nil
}

func printTree(node *ResourceNode, prefix string, isLast bool) {
    // Print current node
    marker := "├─"
    if isLast {
        marker = "└─"
    }

    if prefix == "" {
        fmt.Printf("%s/%s\n", node.Kind, node.Name)
    } else {
        fmt.Printf("%s%s %s/%s\n", prefix, marker, node.Kind, node.Name)
    }

    // Print children
    newPrefix := prefix
    if prefix != "" {
        if isLast {
            newPrefix += "  "
        } else {
            newPrefix += "│ "
        }
    }

    for i, child := range node.Children {
        printTree(child, newPrefix, i == len(node.Children)-1)
    }
}
```

Build and use it:

```bash
go build -o kubectl-resource-graph resource-graph.go
sudo mv kubectl-resource-graph /usr/local/bin/
kubectl resource-graph deployment nginx default
```

## Creating Dependency Visualization Scripts

Build a script that generates DOT format graphs:

```bash
#!/bin/bash
# generate-resource-graph.sh

RESOURCE_TYPE=$1
RESOURCE_NAME=$2
NAMESPACE=${3:-default}

if [ -z "$RESOURCE_TYPE" ] || [ -z "$RESOURCE_NAME" ]; then
    echo "Usage: $0 <resource-type> <resource-name> [namespace]"
    exit 1
fi

OUTPUT_FILE="${RESOURCE_NAME}-graph.dot"

echo "Generating resource graph..."

# Start DOT graph
cat > "$OUTPUT_FILE" <<EOF
digraph ResourceGraph {
    rankdir=TB;
    node [shape=box, style=rounded];

EOF

# Function to add node and edges
add_resource() {
    local kind=$1
    local name=$2
    local parent=$3

    local node_id="${kind}_${name}"

    # Add node
    echo "    \"$node_id\" [label=\"$kind\\n$name\"];" >> "$OUTPUT_FILE"

    # Add edge from parent
    if [ -n "$parent" ]; then
        echo "    \"$parent\" -> \"$node_id\";" >> "$OUTPUT_FILE"
    fi

    # Process based on kind
    case $kind in
        deployment)
            # Get replica sets
            local replicasets=$(kubectl get rs -n "$NAMESPACE" -o json | \
                jq -r ".items[] | select(.metadata.ownerReferences[]?.name==\"$name\") | .metadata.name")

            for rs in $replicasets; do
                add_resource "replicaset" "$rs" "$node_id"
            done
            ;;

        replicaset)
            # Get pods
            local pods=$(kubectl get pods -n "$NAMESPACE" -o json | \
                jq -r ".items[] | select(.metadata.ownerReferences[]?.name==\"$name\") | .metadata.name")

            for pod in $pods; do
                add_resource "pod" "$pod" "$node_id"
            done
            ;;

        pod)
            # Get config maps
            local configmaps=$(kubectl get pod "$name" -n "$NAMESPACE" -o json | \
                jq -r '.spec.volumes[]?.configMap?.name // empty')

            for cm in $configmaps; do
                local cm_id="configmap_${cm}"
                echo "    \"$cm_id\" [label=\"configmap\\n$cm\", fillcolor=lightblue, style=\"rounded,filled\"];" >> "$OUTPUT_FILE"
                echo "    \"$node_id\" -> \"$cm_id\";" >> "$OUTPUT_FILE"
            done

            # Get secrets
            local secrets=$(kubectl get pod "$name" -n "$NAMESPACE" -o json | \
                jq -r '.spec.volumes[]?.secret?.secretName // empty')

            for secret in $secrets; do
                local secret_id="secret_${secret}"
                echo "    \"$secret_id\" [label=\"secret\\n$secret\", fillcolor=lightyellow, style=\"rounded,filled\"];" >> "$OUTPUT_FILE"
                echo "    \"$node_id\" -> \"$secret_id\";" >> "$OUTPUT_FILE"
            done
            ;;
    esac
}

# Build graph starting from root resource
add_resource "$RESOURCE_TYPE" "$RESOURCE_NAME" ""

# Close graph
echo "}" >> "$OUTPUT_FILE"

echo "Graph generated: $OUTPUT_FILE"
echo "Generate PNG with: dot -Tpng $OUTPUT_FILE -o ${RESOURCE_NAME}-graph.png"

# Generate PNG if graphviz is installed
if command -v dot &> /dev/null; then
    dot -Tpng "$OUTPUT_FILE" -o "${RESOURCE_NAME}-graph.png"
    echo "PNG generated: ${RESOURCE_NAME}-graph.png"
fi
```

Use it:

```bash
chmod +x generate-resource-graph.sh
./generate-resource-graph.sh deployment api production
```

## Visualizing Cross-Namespace Dependencies

Track resources that span namespaces:

```bash
#!/bin/bash
# cross-namespace-deps.sh

NAMESPACE=$1

if [ -z "$NAMESPACE" ]; then
    echo "Usage: $0 <namespace>"
    exit 1
fi

echo "Cross-Namespace Dependencies for: $NAMESPACE"
echo "==========================================="

# Check for service references to other namespaces
echo "External Service References:"
kubectl get pods -n "$NAMESPACE" -o json | \
  jq -r '.items[] |
    .spec.containers[] |
    .env[]? |
    select(.value | test("\\.[a-z0-9-]+\\.svc\\.cluster\\.local")) |
    .value' | \
  sort -u

# Check for ingress backends in other namespaces
echo ""
echo "Ingress References:"
kubectl get ingress -n "$NAMESPACE" -o json | \
  jq -r '.items[] |
    .spec.rules[]? |
    .http.paths[]? |
    select(.backend.service.name) |
    "\(.backend.service.name):\(.backend.service.port.number)"' | \
  sort -u

# Check for network policies allowing traffic from other namespaces
echo ""
echo "Network Policy Allowances:"
kubectl get networkpolicy -n "$NAMESPACE" -o json | \
  jq -r '.items[] |
    .spec.ingress[]? |
    .from[]? |
    select(.namespaceSelector) |
    .namespaceSelector.matchLabels // "all-namespaces"'
```

## Building Interactive Resource Explorers

Create a terminal UI for exploring resources:

```bash
#!/bin/bash
# interactive-resource-explorer.sh

explore_resource() {
    local kind=$1
    local name=$2
    local namespace=$3

    clear
    echo "Resource: $kind/$name (namespace: $namespace)"
    echo "========================================"

    # Show resource details
    kubectl get "$kind" "$name" -n "$namespace" -o yaml

    echo ""
    echo "Related Resources:"
    kubectl tree "$kind/$name" -n "$namespace"

    echo ""
    echo "Actions:"
    echo "1) Show pods"
    echo "2) Show events"
    echo "3) Show logs"
    echo "4) Describe"
    echo "b) Back"
    echo "q) Quit"

    read -p "Choose action: " action

    case $action in
        1)
            kubectl get pods -n "$namespace" -l "app=$name"
            read -p "Press enter to continue..."
            explore_resource "$kind" "$name" "$namespace"
            ;;
        2)
            kubectl get events -n "$namespace" --field-selector involvedObject.name="$name"
            read -p "Press enter to continue..."
            explore_resource "$kind" "$name" "$namespace"
            ;;
        3)
            read -p "Pod name: " pod_name
            kubectl logs -n "$namespace" "$pod_name"
            read -p "Press enter to continue..."
            explore_resource "$kind" "$name" "$namespace"
            ;;
        4)
            kubectl describe "$kind" "$name" -n "$namespace"
            read -p "Press enter to continue..."
            explore_resource "$kind" "$name" "$namespace"
            ;;
        q)
            exit 0
            ;;
    esac
}

# Start exploration
read -p "Resource type: " kind
read -p "Resource name: " name
read -p "Namespace [default]: " namespace
namespace=${namespace:-default}

explore_resource "$kind" "$name" "$namespace"
```

Resource visualization tools transform complex Kubernetes hierarchies into understandable structures. Start with kubectl tree for quick inspection, then build custom tools that match your specific observability needs.
