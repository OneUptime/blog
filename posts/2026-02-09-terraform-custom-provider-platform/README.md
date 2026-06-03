# How to Build Terraform Custom Provider for Internal Kubernetes Platform APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Provider Development

Description: Build a custom Terraform provider to manage internal Kubernetes platform APIs, enabling infrastructure as code for your organization's custom resources and services.

---

Most organizations build internal platform services on top of Kubernetes, exposing custom APIs for application teams to consume. While Terraform has excellent provider support for standard Kubernetes resources, it doesn't know about your custom platform APIs. Building a custom Terraform provider bridges this gap, allowing teams to manage both standard infrastructure and internal platform resources using the same declarative workflow.

## Understanding Terraform Provider Architecture

Terraform providers act as plugins that translate Terraform configurations into API calls. The provider handles authentication, resource CRUD operations, and state management. For Kubernetes platform APIs, your provider will interact with Custom Resource Definitions (CRDs) or platform-specific REST endpoints.

The provider SDK from HashiCorp simplifies this process by handling the protocol communication between Terraform core and your provider plugin. You focus on implementing the resource schema and CRUD logic.

## Setting Up Your Provider Project

Start by initializing a Go module for your provider. The provider name should follow the convention `terraform-provider-{name}`:

```bash
mkdir terraform-provider-myplatform
cd terraform-provider-myplatform
go mod init github.com/yourorg/terraform-provider-myplatform
```

Install the required dependencies:

```bash
go get github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema
go get github.com/hashicorp/terraform-plugin-sdk/v2/plugin
go get k8s.io/client-go@v0.28.0
go get k8s.io/apimachinery@v0.28.0
```

## Implementing the Provider Configuration

The provider configuration handles authentication and connection details. For a Kubernetes platform, you'll typically use kubeconfig or in-cluster authentication:

```go
// provider.go
package main

import (
    "context"
    "github.com/hashicorp/terraform-plugin-sdk/v2/diag"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

func Provider() *schema.Provider {
    return &schema.Provider{
        Schema: map[string]*schema.Schema{
            "kubeconfig_path": {
                Type:        schema.TypeString,
                Optional:    true,
                DefaultFunc: schema.EnvDefaultFunc("KUBECONFIG", ""),
                Description: "Path to kubeconfig file",
            },
            "context": {
                Type:        schema.TypeString,
                Optional:    true,
                Description: "Kubernetes context to use",
            },
            "platform_api_endpoint": {
                Type:        schema.TypeString,
                Optional:    true,
                DefaultFunc: schema.EnvDefaultFunc("PLATFORM_API_ENDPOINT", ""),
                Description: "Custom platform API endpoint",
            },
        },
        ResourcesMap: map[string]*schema.Resource{
            "myplatform_application": resourceApplication(),
        },
        ConfigureContextFunc: providerConfigure,
    }
}

type PlatformClient struct {
    kubeConfig *rest.Config
    apiEndpoint string
}

func providerConfigure(ctx context.Context, d *schema.ResourceData) (interface{}, diag.Diagnostics) {
    var diags diag.Diagnostics

    kubeconfigPath := d.Get("kubeconfig_path").(string)
    context := d.Get("context").(string)
    apiEndpoint := d.Get("platform_api_endpoint").(string)

    // Build Kubernetes config
    var config *rest.Config
    var err error

    if kubeconfigPath != "" {
        loadingRules := &clientcmd.ClientConfigLoadingRules{
            ExplicitPath: kubeconfigPath,
        }
        configOverrides := &clientcmd.ConfigOverrides{}
        if context != "" {
            configOverrides.CurrentContext = context
        }
        config, err = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
            loadingRules,
            configOverrides,
        ).ClientConfig()
    } else {
        // Try in-cluster config
        config, err = rest.InClusterConfig()
    }

    if err != nil {
        return nil, diag.FromErr(err)
    }

    client := &PlatformClient{
        kubeConfig: config,
        apiEndpoint: apiEndpoint,
    }

    return client, diags
}
```

## Creating a Resource for Custom Platform Objects

Now implement a resource that manages a custom platform object. This example handles an Application resource that represents a deployed application on your platform:

```go
// resource_application.go
package main

import (
    "context"
    "fmt"
    "strings"
    "github.com/hashicorp/terraform-plugin-sdk/v2/diag"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
    apierrors "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    k8sschema "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
)

func resourceApplication() *schema.Resource {
    return &schema.Resource{
        CreateContext: resourceApplicationCreate,
        ReadContext:   resourceApplicationRead,
        UpdateContext: resourceApplicationUpdate,
        DeleteContext: resourceApplicationDelete,
        Importer: &schema.ResourceImporter{
            StateContext: func(ctx context.Context, d *schema.ResourceData, meta interface{}) ([]*schema.ResourceData, error) {
                parts := strings.SplitN(d.Id(), "/", 2)
                if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
                    return nil, fmt.Errorf("expected import ID in namespace/name format")
                }
                d.Set("namespace", parts[0])
                d.Set("name", parts[1])
                return []*schema.ResourceData{d}, nil
            },
        },
        Schema: map[string]*schema.Schema{
            "name": {
                Type:        schema.TypeString,
                Required:    true,
                ForceNew:    true,
                Description: "Application name",
            },
            "namespace": {
                Type:        schema.TypeString,
                Required:    true,
                ForceNew:    true,
                Description: "Kubernetes namespace",
            },
            "image": {
                Type:        schema.TypeString,
                Required:    true,
                Description: "Container image",
            },
            "replicas": {
                Type:        schema.TypeInt,
                Optional:    true,
                Default:     1,
                Description: "Number of replicas",
            },
            "environment": {
                Type:        schema.TypeMap,
                Optional:    true,
                Elem:        &schema.Schema{Type: schema.TypeString},
                Description: "Environment variables",
            },
            "resources": {
                Type:     schema.TypeList,
                Optional: true,
                MaxItems: 1,
                Elem: &schema.Resource{
                    Schema: map[string]*schema.Schema{
                        "cpu_request": {
                            Type:     schema.TypeString,
                            Optional: true,
                            Default:  "100m",
                        },
                        "memory_request": {
                            Type:     schema.TypeString,
                            Optional: true,
                            Default:  "128Mi",
                        },
                        "cpu_limit": {
                            Type:     schema.TypeString,
                            Optional: true,
                            Default:  "500m",
                        },
                        "memory_limit": {
                            Type:     schema.TypeString,
                            Optional: true,
                            Default:  "512Mi",
                        },
                    },
                },
            },
            "status": {
                Type:        schema.TypeString,
                Computed:    true,
                Description: "Application deployment status",
            },
        },
    }
}

func applicationGVR() k8sschema.GroupVersionResource {
    return k8sschema.GroupVersionResource{
        Group:    "platform.mycompany.com",
        Version:  "v1",
        Resource: "applications",
    }
}

func buildApplicationEnvironment(d *schema.ResourceData) map[string]string {
    envVars := make(map[string]string)
    if env, ok := d.GetOk("environment"); ok {
        for k, v := range env.(map[string]interface{}) {
            envVars[k] = v.(string)
        }
    }
    return envVars
}

func buildApplicationResources(d *schema.ResourceData) map[string]interface{} {
    resources := map[string]interface{}{
        "cpuRequest":    "100m",
        "memoryRequest": "128Mi",
        "cpuLimit":      "500m",
        "memoryLimit":   "512Mi",
    }
    if resourceList, ok := d.GetOk("resources"); ok {
        if len(resourceList.([]interface{})) > 0 {
            r := resourceList.([]interface{})[0].(map[string]interface{})
            if v, ok := r["cpu_request"]; ok {
                resources["cpuRequest"] = v.(string)
            }
            if v, ok := r["memory_request"]; ok {
                resources["memoryRequest"] = v.(string)
            }
            if v, ok := r["cpu_limit"]; ok {
                resources["cpuLimit"] = v.(string)
            }
            if v, ok := r["memory_limit"]; ok {
                resources["memoryLimit"] = v.(string)
            }
        }
    }
    return resources
}

func resourceApplicationCreate(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*PlatformClient)

    // Create dynamic client for custom resources
    dynamicClient, err := dynamic.NewForConfig(client.kubeConfig)
    if err != nil {
        return diag.FromErr(err)
    }

    name := d.Get("name").(string)
    namespace := d.Get("namespace").(string)
    image := d.Get("image").(string)
    replicas := int64(d.Get("replicas").(int))

    // Create unstructured object
    application := &unstructured.Unstructured{
        Object: map[string]interface{}{
            "apiVersion": "platform.mycompany.com/v1",
            "kind":       "Application",
            "metadata": map[string]interface{}{
                "name":      name,
                "namespace": namespace,
            },
            "spec": map[string]interface{}{
                "image":       image,
                "replicas":    replicas,
                "environment": buildApplicationEnvironment(d),
                "resources":   buildApplicationResources(d),
            },
        },
    }

    // Create the resource
    _, err = dynamicClient.Resource(applicationGVR()).Namespace(namespace).Create(
        ctx,
        application,
        metav1.CreateOptions{},
    )
    if err != nil {
        return diag.FromErr(err)
    }

    d.SetId(fmt.Sprintf("%s/%s", namespace, name))

    // Read back the created resource to get computed fields
    return resourceApplicationRead(ctx, d, meta)
}

func resourceApplicationRead(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*PlatformClient)

    dynamicClient, err := dynamic.NewForConfig(client.kubeConfig)
    if err != nil {
        return diag.FromErr(err)
    }

    namespace := d.Get("namespace").(string)
    name := d.Get("name").(string)

    result, err := dynamicClient.Resource(applicationGVR()).Namespace(namespace).Get(
        ctx,
        name,
        metav1.GetOptions{},
    )
    if err != nil {
        if apierrors.IsNotFound(err) {
            d.SetId("")
            return nil
        }
        return diag.FromErr(err)
    }

    // Extract status from the resource
    spec, _, err := unstructured.NestedMap(result.Object, "spec")
    if err != nil {
        return diag.FromErr(err)
    }

    if image, ok := spec["image"]; ok {
        if err := d.Set("image", image); err != nil {
            return diag.FromErr(err)
        }
    }
    if replicas, ok := spec["replicas"]; ok {
        if err := d.Set("replicas", replicas); err != nil {
            return diag.FromErr(err)
        }
    }
    if environment, ok := spec["environment"]; ok {
        if err := d.Set("environment", environment); err != nil {
            return diag.FromErr(err)
        }
    }

    statusPhase, _, err := unstructured.NestedString(result.Object, "status", "phase")
    if err != nil {
        return diag.FromErr(err)
    }
    if statusPhase != "" {
        if err := d.Set("status", statusPhase); err != nil {
            return diag.FromErr(err)
        }
    }

    return nil
}

func resourceApplicationUpdate(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*PlatformClient)

    dynamicClient, err := dynamic.NewForConfig(client.kubeConfig)
    if err != nil {
        return diag.FromErr(err)
    }

    namespace := d.Get("namespace").(string)
    name := d.Get("name").(string)

    // Get current resource
    current, err := dynamicClient.Resource(applicationGVR()).Namespace(namespace).Get(
        ctx,
        name,
        metav1.GetOptions{},
    )
    if err != nil {
        return diag.FromErr(err)
    }

    // Update spec fields
    spec, _, err := unstructured.NestedMap(current.Object, "spec")
    if err != nil {
        return diag.FromErr(err)
    }
    spec["image"] = d.Get("image").(string)
    spec["replicas"] = int64(d.Get("replicas").(int))
    spec["environment"] = buildApplicationEnvironment(d)
    spec["resources"] = buildApplicationResources(d)
    if err := unstructured.SetNestedMap(current.Object, spec, "spec"); err != nil {
        return diag.FromErr(err)
    }

    // Update the resource
    _, err = dynamicClient.Resource(applicationGVR()).Namespace(namespace).Update(
        ctx,
        current,
        metav1.UpdateOptions{},
    )
    if err != nil {
        return diag.FromErr(err)
    }

    return resourceApplicationRead(ctx, d, meta)
}

func resourceApplicationDelete(ctx context.Context, d *schema.ResourceData, meta interface{}) diag.Diagnostics {
    client := meta.(*PlatformClient)

    dynamicClient, err := dynamic.NewForConfig(client.kubeConfig)
    if err != nil {
        return diag.FromErr(err)
    }

    namespace := d.Get("namespace").(string)
    name := d.Get("name").(string)

    err = dynamicClient.Resource(applicationGVR()).Namespace(namespace).Delete(
        ctx,
        name,
        metav1.DeleteOptions{},
    )
    if err != nil && !apierrors.IsNotFound(err) {
        return diag.FromErr(err)
    }

    d.SetId("")
    return nil
}
```

## Building and Installing the Provider

Create the main entry point:

```go
// main.go
package main

import (
    "github.com/hashicorp/terraform-plugin-sdk/v2/plugin"
)

func main() {
    plugin.Serve(&plugin.ServeOpts{
        ProviderFunc: Provider,
    })
}
```

Build and install locally for testing:

```bash
go build -o terraform-provider-myplatform
mkdir -p ~/.terraform.d/plugins/registry.terraform.io/yourorg/myplatform/1.0.0/darwin_amd64
cp terraform-provider-myplatform ~/.terraform.d/plugins/registry.terraform.io/yourorg/myplatform/1.0.0/darwin_amd64/terraform-provider-myplatform_v1.0.0
```

## Using Your Custom Provider

Create a Terraform configuration to use your provider:

```hcl
terraform {
  required_providers {
    myplatform = {
      source  = "yourorg/myplatform"
      version = "1.0.0"
    }
  }
}

provider "myplatform" {
  kubeconfig_path = pathexpand("~/.kube/config")
  context         = "my-cluster"
}

resource "myplatform_application" "api" {
  name      = "my-api"
  namespace = "production"
  image     = "myapp/api:v1.0.0"
  replicas  = 3

  environment = {
    DATABASE_URL = "postgres://db:5432/app"
    LOG_LEVEL    = "info"
  }

  resources {
    cpu_request    = "200m"
    memory_request = "256Mi"
    cpu_limit      = "1000m"
    memory_limit   = "1Gi"
  }
}
```

Run terraform commands as usual:

```bash
terraform init
terraform plan
terraform apply
```

Building a custom Terraform provider for your internal Kubernetes platform APIs enables consistent infrastructure management across your organization. Teams can declare both standard Kubernetes resources and custom platform services in the same configuration, improving developer experience and operational efficiency. The provider SDK handles the complexity of Terraform protocols, allowing you to focus on implementing the business logic specific to your platform.
