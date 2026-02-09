# How to Build Custom Kubectl Plugins Using Go for Team-Specific Kubernetes Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Go, Kubectl, DevOps, CLI

Description: Learn how to build custom kubectl plugins in Go to automate team-specific Kubernetes workflows, reduce repetitive tasks, and extend kubectl functionality with practical examples and best practices.

---

Working with Kubernetes clusters often involves repetitive tasks that are specific to your organization's workflows. While kubectl provides extensive functionality out of the box, creating custom plugins can significantly improve your team's productivity by encapsulating complex operations into simple commands.

Building kubectl plugins in Go offers strong typing, excellent Kubernetes client library support, and the ability to compile to a single binary that works across platforms. This guide walks through creating custom plugins that solve real-world problems your team faces daily.

## Understanding Kubectl Plugin Architecture

Kubectl plugins follow a simple convention. Any executable file in your PATH with a name starting with `kubectl-` becomes a kubectl subcommand. For example, an executable named `kubectl-deploy-stack` can be invoked as `kubectl deploy-stack`.

The plugin system passes all arguments after the plugin name to your executable. This simplicity makes it easy to create powerful extensions without modifying kubectl itself.

## Setting Up Your Go Plugin Project

Start by creating a new Go project structure for your plugin:

```bash
mkdir kubectl-deploy-stack
cd kubectl-deploy-stack
go mod init github.com/yourorg/kubectl-deploy-stack
```

Install the necessary Kubernetes client libraries:

```bash
go get k8s.io/client-go@latest
go get k8s.io/api@latest
go get k8s.io/apimachinery@latest
go get github.com/spf13/cobra@latest
```

The `client-go` library provides everything you need to interact with Kubernetes clusters, while Cobra helps build a robust CLI interface.

## Building a Deployment Stack Plugin

Let's create a plugin that deploys a complete application stack (deployment, service, and ingress) with a single command. This example demonstrates API interactions, error handling, and CLI argument parsing.

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/spf13/cobra"
    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    networkingv1 "k8s.io/api/networking/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

var (
    namespace   string
    replicas    int32
    image       string
    port        int32
    hostName    string
)

func main() {
    var rootCmd = &cobra.Command{
        Use:   "kubectl-deploy-stack [name]",
        Short: "Deploy a complete application stack",
        Args:  cobra.ExactArgs(1),
        RunE:  deployStack,
    }

    // Define flags
    rootCmd.Flags().StringVarP(&namespace, "namespace", "n", "default", "Kubernetes namespace")
    rootCmd.Flags().Int32VarP(&replicas, "replicas", "r", 3, "Number of replicas")
    rootCmd.Flags().StringVarP(&image, "image", "i", "", "Container image (required)")
    rootCmd.Flags().Int32VarP(&port, "port", "p", 8080, "Container port")
    rootCmd.Flags().StringVar(&hostName, "host", "", "Ingress hostname (required)")

    rootCmd.MarkFlagRequired("image")
    rootCmd.MarkFlagRequired("host")

    if err := rootCmd.Execute(); err != nil {
        os.Exit(1)
    }
}

func deployStack(cmd *cobra.Command, args []string) error {
    name := args[0]

    // Create Kubernetes client
    clientset, err := getKubernetesClient()
    if err != nil {
        return fmt.Errorf("failed to create client: %v", err)
    }

    ctx := context.Background()

    // Create deployment
    if err := createDeployment(ctx, clientset, name); err != nil {
        return fmt.Errorf("failed to create deployment: %v", err)
    }
    fmt.Printf("Deployment %s created successfully\n", name)

    // Create service
    if err := createService(ctx, clientset, name); err != nil {
        return fmt.Errorf("failed to create service: %v", err)
    }
    fmt.Printf("Service %s created successfully\n", name)

    // Create ingress
    if err := createIngress(ctx, clientset, name); err != nil {
        return fmt.Errorf("failed to create ingress: %v", err)
    }
    fmt.Printf("Ingress %s created successfully\n", name)

    fmt.Printf("\nStack deployed successfully! Access at: http://%s\n", hostName)
    return nil
}

func getKubernetesClient() (*kubernetes.Clientset, error) {
    // Use the current context from kubeconfig
    loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
    configOverrides := &clientcmd.ConfigOverrides{}
    kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

    config, err := kubeConfig.ClientConfig()
    if err != nil {
        return nil, err
    }

    return kubernetes.NewForConfig(config)
}

func createDeployment(ctx context.Context, clientset *kubernetes.Clientset, name string) error {
    deploymentsClient := clientset.AppsV1().Deployments(namespace)

    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name: name,
            Labels: map[string]string{
                "app": name,
            },
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{
                    "app": name,
                },
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{
                        "app": name,
                    },
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  name,
                            Image: image,
                            Ports: []corev1.ContainerPort{
                                {
                                    ContainerPort: port,
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    _, err := deploymentsClient.Create(ctx, deployment, metav1.CreateOptions{})
    return err
}

func createService(ctx context.Context, clientset *kubernetes.Clientset, name string) error {
    servicesClient := clientset.CoreV1().Services(namespace)

    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name: name,
        },
        Spec: corev1.ServiceSpec{
            Selector: map[string]string{
                "app": name,
            },
            Ports: []corev1.ServicePort{
                {
                    Port:     80,
                    TargetPort: intstr.FromInt(int(port)),
                },
            },
        },
    }

    _, err := servicesClient.Create(ctx, service, metav1.CreateOptions{})
    return err
}

func createIngress(ctx context.Context, clientset *kubernetes.Clientset, name string) error {
    ingressClient := clientset.NetworkingV1().Ingresses(namespace)

    pathType := networkingv1.PathTypePrefix
    ingress := &networkingv1.Ingress{
        ObjectMeta: metav1.ObjectMeta{
            Name: name,
        },
        Spec: networkingv1.IngressSpec{
            Rules: []networkingv1.IngressRule{
                {
                    Host: hostName,
                    IngressRuleValue: networkingv1.IngressRuleValue{
                        HTTP: &networkingv1.HTTPIngressRuleValue{
                            Paths: []networkingv1.HTTPIngressPath{
                                {
                                    Path:     "/",
                                    PathType: &pathType,
                                    Backend: networkingv1.IngressBackend{
                                        Service: &networkingv1.IngressServiceBackend{
                                            Name: name,
                                            Port: networkingv1.ServiceBackendPort{
                                                Number: 80,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    _, err := ingressClient.Create(ctx, ingress, metav1.CreateOptions{})
    return err
}
```

## Building and Installing Your Plugin

Compile your plugin into a binary and place it in your PATH:

```bash
go build -o kubectl-deploy-stack main.go
sudo mv kubectl-deploy-stack /usr/local/bin/
chmod +x /usr/local/bin/kubectl-deploy-stack
```

Now you can use your plugin:

```bash
kubectl deploy-stack myapp \
  --image nginx:latest \
  --host myapp.example.com \
  --replicas 5 \
  --namespace production
```

## Adding Advanced Features

Extend your plugin with additional capabilities that match your team's workflow:

```go
// Add update capability
func updateStack(ctx context.Context, clientset *kubernetes.Clientset, name string) error {
    deploymentsClient := clientset.AppsV1().Deployments(namespace)

    // Get existing deployment
    deployment, err := deploymentsClient.Get(ctx, name, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Update image
    deployment.Spec.Template.Spec.Containers[0].Image = image

    // Update replicas
    deployment.Spec.Replicas = &replicas

    _, err = deploymentsClient.Update(ctx, deployment, metav1.UpdateOptions{})
    return err
}

// Add status checking
func checkStackStatus(ctx context.Context, clientset *kubernetes.Clientset, name string) error {
    deploymentsClient := clientset.AppsV1().Deployments(namespace)

    deployment, err := deploymentsClient.Get(ctx, name, metav1.GetOptions{})
    if err != nil {
        return err
    }

    fmt.Printf("Deployment: %s\n", name)
    fmt.Printf("  Desired Replicas: %d\n", *deployment.Spec.Replicas)
    fmt.Printf("  Available Replicas: %d\n", deployment.Status.AvailableReplicas)
    fmt.Printf("  Ready Replicas: %d\n", deployment.Status.ReadyReplicas)

    return nil
}
```

## Best Practices for Plugin Development

When building kubectl plugins, follow these practices to ensure reliability and usability:

First, respect the kubectl configuration context. Your plugin should use the same kubeconfig and context that kubectl uses, allowing users to switch contexts as needed.

Second, implement proper error handling and provide clear error messages. Users should understand what went wrong and how to fix it.

Third, add dry-run support for destructive operations. This lets users preview changes before applying them.

Fourth, follow kubectl naming conventions. Use hyphens in command names and implement flags similar to built-in kubectl commands.

## Distribution and Versioning

Use Krew, the kubectl plugin manager, to distribute your plugin to the wider community:

```yaml
# deploy-stack.yaml
apiVersion: krew.googlecontainertools.github.com/v1alpha2
kind: Plugin
metadata:
  name: deploy-stack
spec:
  version: v1.0.0
  homepage: https://github.com/yourorg/kubectl-deploy-stack
  shortDescription: Deploy complete application stacks
  description: |
    Deploy a complete application stack including deployment,
    service, and ingress with a single command.
  platforms:
  - selector:
      matchLabels:
        os: linux
        arch: amd64
    uri: https://github.com/yourorg/kubectl-deploy-stack/releases/download/v1.0.0/kubectl-deploy-stack-linux-amd64.tar.gz
    sha256: "YOUR_SHA256_HERE"
    bin: kubectl-deploy-stack
  - selector:
      matchLabels:
        os: darwin
        arch: amd64
    uri: https://github.com/yourorg/kubectl-deploy-stack/releases/download/v1.0.0/kubectl-deploy-stack-darwin-amd64.tar.gz
    sha256: "YOUR_SHA256_HERE"
    bin: kubectl-deploy-stack
```

Building custom kubectl plugins in Go transforms repetitive Kubernetes operations into simple, shareable commands. Start with the workflows that consume the most time in your day-to-day operations, then expand your plugin library as new patterns emerge.
