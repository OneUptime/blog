# How to Add Custom Printer Columns to CRDs for kubectl Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, kubectl

Description: Learn how to configure custom printer columns in your Custom Resource Definitions to display meaningful information when using kubectl get commands.

---

When you run kubectl get pods, you see useful columns like STATUS, RESTARTS, and AGE. But when you create a Custom Resource Definition without configuring printer columns, kubectl get shows only NAME and AGE. That's like buying a sports car and only looking at the odometer.

Custom printer columns let you surface the most important information about your custom resources directly in kubectl output. This guide shows you how to configure them effectively.

## Why Custom Printer Columns Matter

Default kubectl output for custom resources is minimal. You get the resource name and age. To see anything else, you need to describe the resource or output full YAML. That's tedious when you're scanning resources to understand cluster state.

Custom printer columns solve this by letting you specify exactly which fields appear in kubectl get output. You can show status, configuration details, or any field from your resource spec or status.

## Basic Printer Column Configuration

Let's start with a simple example. We'll create a Database CRD that shows connection status and database type.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    kind: Database
    plural: databases
    singular: database
    shortNames:
    - db
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              type:
                type: string
                enum:
                - postgres
                - mysql
                - mongodb
              version:
                type: string
              storage:
                type: string
          status:
            type: object
            properties:
              phase:
                type: string
              ready:
                type: boolean
              endpoint:
                type: string
    additionalPrinterColumns:
    - name: Type
      type: string
      description: Database type
      jsonPath: .spec.type
    - name: Version
      type: string
      description: Database version
      jsonPath: .spec.version
    - name: Ready
      type: boolean
      description: Whether the database is ready
      jsonPath: .status.ready
    - name: Endpoint
      type: string
      description: Database connection endpoint
      jsonPath: .status.endpoint
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
```

Now when you run kubectl get databases, you'll see:

```
NAME        TYPE       VERSION   READY   ENDPOINT                    AGE
prod-db     postgres   14.5      true    prod-db.default.svc:5432    5d
staging-db  mysql      8.0       true    staging-db.default.svc:3306 2d
```

Much more useful than just NAME and AGE.

## Understanding JSONPath Expressions

The jsonPath field uses JSONPath syntax to extract values from your resource. Here are the most common patterns.

```yaml
additionalPrinterColumns:
# Simple field access
- name: Name
  jsonPath: .metadata.name

# Nested fields
- name: Image
  jsonPath: .spec.template.spec.containers[0].image

# Array element
- name: FirstPort
  jsonPath: .spec.ports[0].port

# Status subresource
- name: Phase
  jsonPath: .status.phase

# Multiple levels deep
- name: CPU
  jsonPath: .spec.resources.requests.cpu
```

The dot notation navigates the JSON structure of your resource. Array indices use bracket notation.

## Column Types and Formatting

Kubernetes supports several column types that affect how values display.

```yaml
additionalPrinterColumns:
# String - displays as-is
- name: Message
  type: string
  jsonPath: .status.message

# Integer - displays numeric values
- name: Replicas
  type: integer
  jsonPath: .spec.replicas

# Boolean - displays true/false
- name: Enabled
  type: boolean
  jsonPath: .spec.enabled

# Date - displays as age (2d, 5h, etc)
- name: Age
  type: date
  jsonPath: .metadata.creationTimestamp

# Date with full timestamp
- name: LastUpdated
  type: date
  jsonPath: .status.lastUpdateTime
```

The date type is particularly useful. It automatically calculates the age relative to the current time, just like standard Kubernetes resources.

## Showing Nested Object Information

Sometimes you want to display information from nested objects. JSONPath handles this elegantly.

```yaml
spec:
  versions:
  - name: v1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              deployment:
                type: object
                properties:
                  replicas:
                    type: integer
                  image:
                    type: string
                  resources:
                    type: object
                    properties:
                      limits:
                        type: object
                        properties:
                          memory:
                            type: string
                          cpu:
                            type: string
    additionalPrinterColumns:
    - name: Replicas
      type: integer
      jsonPath: .spec.deployment.replicas
    - name: Image
      type: string
      jsonPath: .spec.deployment.image
    - name: Memory
      type: string
      jsonPath: .spec.deployment.resources.limits.memory
    - name: CPU
      type: string
      jsonPath: .spec.deployment.resources.limits.cpu
```

This lets you pull specific details from complex nested structures without overwhelming the output.

## Priority Columns for Wide Output

You can designate some columns as priority 0 (always shown) and others as priority 1 (shown with kubectl get -o wide).

```yaml
additionalPrinterColumns:
# Always shown
- name: Status
  type: string
  priority: 0
  jsonPath: .status.phase

- name: Ready
  type: boolean
  priority: 0
  jsonPath: .status.ready

# Shown with -o wide
- name: Image
  type: string
  priority: 1
  jsonPath: .spec.image

- name: Node
  type: string
  priority: 1
  jsonPath: .status.nodeName

- name: IP
  type: string
  priority: 1
  jsonPath: .status.podIP
```

This gives users a compact default view with the option to see more details when needed.

## Handling Missing Fields

Not all resources will have values for every printer column. JSONPath handles missing fields gracefully by showing <none>.

You can also provide descriptive names and descriptions to clarify what each column represents.

```yaml
additionalPrinterColumns:
- name: External IP
  type: string
  description: External IP address if assigned
  jsonPath: .status.externalIP

- name: Load Balancer
  type: string
  description: Cloud load balancer hostname
  jsonPath: .status.loadBalancer.hostname
```

When these fields are empty, the output shows <none> in those columns, which is clear enough for users to understand the value hasn't been set.

## Real-World Example: Application CRD

Here's a complete example for an Application CRD that manages deployments.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Application
    plural: applications
    singular: application
    shortNames:
    - app
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              image:
                type: string
              replicas:
                type: integer
              environment:
                type: string
                enum:
                - development
                - staging
                - production
          status:
            type: object
            properties:
              phase:
                type: string
              availableReplicas:
                type: integer
              url:
                type: string
              lastDeployment:
                type: string
                format: date-time
    additionalPrinterColumns:
    - name: Environment
      type: string
      priority: 0
      description: Deployment environment
      jsonPath: .spec.environment
    - name: Status
      type: string
      priority: 0
      description: Application status
      jsonPath: .status.phase
    - name: Replicas
      type: string
      priority: 0
      description: Available/Desired replicas
      jsonPath: .status.availableReplicas
    - name: URL
      type: string
      priority: 1
      description: Application URL
      jsonPath: .status.url
    - name: Image
      type: string
      priority: 1
      description: Container image
      jsonPath: .spec.image
    - name: Last Deployed
      type: date
      priority: 1
      description: Last deployment time
      jsonPath: .status.lastDeployment
    - name: Age
      type: date
      priority: 0
      jsonPath: .metadata.creationTimestamp
```

When you run kubectl get applications, you see:

```
NAME          ENVIRONMENT   STATUS    REPLICAS   AGE
api-service   production    Running   5          10d
web-app       production    Running   3          5d
worker        staging       Running   2          2d
```

And with kubectl get applications -o wide:

```
NAME          ENVIRONMENT   STATUS    REPLICAS   URL                        IMAGE                    LAST DEPLOYED   AGE
api-service   production    Running   5          https://api.example.com    registry/api:v2.5.1      2d              10d
web-app       production    Running   3          https://example.com        registry/web:v1.8.2      12h             5d
worker        staging       Running   2          <none>                     registry/worker:v0.3.0   1d              2d
```

## Combining Multiple Values

Sometimes you want to show a ratio or combination of values. While JSONPath doesn't support arithmetic, you can use your controller to populate a combined status field.

```yaml
# In your controller, set a combined status field
status:
  replicaStatus: "3/5"  # available/desired

# Then reference it in printer columns
additionalPrinterColumns:
- name: Replicas
  type: string
  jsonPath: .status.replicaStatus
```

This gives you more control over how information displays.

## Testing Your Printer Columns

After creating your CRD, test the printer columns with various resource states.

```bash
# Apply the CRD
kubectl apply -f application-crd.yaml

# Create a test resource
cat <<EOF | kubectl apply -f -
apiVersion: platform.example.com/v1
kind: Application
metadata:
  name: test-app
spec:
  image: nginx:latest
  replicas: 2
  environment: staging
status:
  phase: Running
  availableReplicas: 2
  url: https://test.example.com
EOF

# Check the output
kubectl get applications
kubectl get applications -o wide
```

Verify that all columns display correctly and that wide output shows the additional details you configured.

## Best Practices

Keep printer columns focused on the most important information. Five to seven columns is usually the sweet spot. More than that becomes cluttered.

Always include a Status or Phase column so users can quickly see resource health. Include Age as the last column to match standard Kubernetes output conventions.

Use priority levels to separate essential information from nice-to-have details. This keeps default output clean while providing depth for users who need it.

Document your columns with clear descriptions. These appear in kubectl explain and help users understand what they're looking at.

## Conclusion

Custom printer columns turn kubectl get from a basic listing tool into a powerful dashboard for your custom resources. The configuration is straightforward, but the impact on usability is substantial.

Start by identifying the three to five most important fields for your resource. Configure those as priority 0 columns. Then add supporting details as priority 1 columns for wide output. Test with real resources and iterate based on what information proves most useful in practice.
