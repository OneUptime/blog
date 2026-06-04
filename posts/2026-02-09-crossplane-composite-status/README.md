# How to Configure Crossplane Composite Resource Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Status Management, Observability

Description: Learn how to configure Crossplane composite resource status fields to provide meaningful feedback about infrastructure provisioning state and health to platform users.

---

A claim creates infrastructure. Users need to know if it worked. Is the database ready? Did the network provision correctly? Are the load balancers healthy? Composite resource status answers these questions by surfacing information from managed resources to users.

Status fields report the current state of infrastructure. Conditions track readiness and health. Custom fields expose endpoints, URLs, and other important details. This guide shows you how to configure status reporting effectively.

## Understanding Composite Resource Status

Composite resources have two types of status information:

**Standard conditions** follow Kubernetes conventions. Ready indicates overall health. Synced shows whether Crossplane successfully reconciled the resource. These appear automatically.

**Custom status fields** expose information specific to your platform. A database status might include its endpoint URL and port. An application status could show the number of ready replicas. You define these in the XRD schema.

Status flows from managed resources through compositions to composite resources and finally to claims. Users see the aggregated state without accessing individual managed resources.

## Defining Custom Status Fields

Start with an XRD that includes custom status fields.

```yaml
# xrd-database-with-status.yaml

apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
  claimNames:
    kind: DatabaseClaim
    plural: databaseclaims
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  properties:
                    size:
                      type: string
                      enum: ["small", "medium", "large"]
                  required:
                    - size
              required:
                - parameters
            status:
              type: object
              properties:
                # Connection information
                endpoint:
                  type: string
                  description: Database connection endpoint
                port:
                  type: integer
                  description: Database port number
                # State information
                state:
                  type: string
                  enum: ["provisioning", "available", "modifying", "failed"]
                  description: Current database state
                # Health metrics
                storageUsed:
                  type: string
                  description: Amount of storage currently used
                cpuUtilization:
                  type: number
                  description: Current CPU utilization percentage
                # Backup information
                lastBackupTime:
                  type: string
                  format: date-time
                  description: Timestamp of last successful backup
                backupStatus:
                  type: string
                  enum: ["healthy", "degraded", "failed"]
```

This XRD defines several status fields that will be populated from managed resources.

## Populating Status from Managed Resources

Use status patches in a Function Patch and Transform composition to copy data from managed resources to composite status.

```yaml
# composition-database-status.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-postgres-database
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium
                  allocatedStorage: 100
            patches:
              # Copy endpoint to composite status
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.address
                toFieldPath: status.endpoint
                policy:
                  fromFieldPath: Optional

              # Copy port to composite status
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.port
                toFieldPath: status.port
                policy:
                  fromFieldPath: Optional

              # Map RDS status to our simplified state
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.status
                toFieldPath: status.state
                transforms:
                  - type: match
                    match:
                      patterns:
                        - type: literal
                          literal: creating
                          result: provisioning
                        - type: literal
                          literal: available
                          result: available
                        - type: literal
                          literal: modifying
                          result: modifying
                        - type: literal
                          literal: backing-up
                          result: available
                        - type: literal
                          literal: deleting
                          result: provisioning
                        - type: literal
                          literal: failed
                          result: failed
                      fallbackTo: Value
                      fallbackValue: provisioning

              # Copy allocated storage
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.allocatedStorage
                toFieldPath: status.storageUsed
                transforms:
                  - type: string
                    string:
                      type: Format
                      fmt: "%vGi"
```

When the RDS instance updates, Crossplane copies its status fields to the composite resource.

## Aggregating Status from Multiple Resources

Combine status from multiple managed resources.

```yaml
# composition-app-stack-status.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: application-stack
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: ApplicationStack
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          # Database
          - name: database
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium
            patches:
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.address
                toFieldPath: status.database.endpoint

              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.status
                toFieldPath: status.database.state

          # Cache
          - name: cache
            base:
              apiVersion: elasticache.aws.upbound.io/v1beta1
              kind: Cluster
              spec:
                forProvider:
                  region: us-west-2
                  cacheNodeType: cache.t3.micro
                  engine: redis
                  numCacheNodes: 1
            patches:
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.cacheNodes[0].address
                toFieldPath: status.cache.endpoint

              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.cacheClusterStatus
                toFieldPath: status.cache.state

          # Load Balancer
          - name: load-balancer
            base:
              apiVersion: elbv2.aws.upbound.io/v1beta1
              kind: LB
              spec:
                forProvider:
                  region: us-west-2
                  loadBalancerType: application
            patches:
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.dnsName
                toFieldPath: status.loadBalancer.url
                transforms:
                  - type: string
                    string:
                      type: Format
                      fmt: "https://%s"
```

The composite status includes sections for each component.

## Computing Derived Status Fields

Calculate status values based on managed-resource fields.

```yaml
# composition-computed-status.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-with-computed-status
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium
                  allocatedStorage: 100
            patches:
              # Expose storage limits
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.allocatedStorage
                toFieldPath: status.storageTotal

              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.maxAllocatedStorage
                toFieldPath: status.storageMax

              # Compute connection string
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.address
                toFieldPath: status.connectionString
                transforms:
                  - type: string
                    string:
                      type: Format
                      fmt: "postgresql://user:password@%s:5432/postgres"

              # Calculate cost estimate
              - type: ToCompositeFieldPath
                fromFieldPath: spec.forProvider.instanceClass
                toFieldPath: status.estimatedMonthlyCost
                transforms:
                  - type: map
                    map:
                      db.t3.small: "$50"
                      db.t3.medium: "$100"
                      db.t3.large: "$200"
                      db.r5.large: "$500"
                      db.r5.xlarge: "$1000"
```

Transforms compute derived values like connection strings and cost estimates.

## Setting Readiness Based on Status

Control when the composite resource reports as ready.

```yaml
# composition-with-readiness.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-with-readiness
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium
            # Define readiness checks
            readinessChecks:
              - type: MatchString
                fieldPath: status.atProvider.status
                matchString: available

              - type: NonEmpty
                fieldPath: status.atProvider.address
```

The composite resource only reports ready when all checks pass.

## Using Conditions for Health Reporting

Do not define `status.conditions` in the XRD schema. Crossplane owns `Ready` and `Synced`, and `status.conditions` is a reserved field.

```yaml
# xrd-with-conditions.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            status:
              type: object
              properties:
                backupStatus:
                  type: string
                  enum: ["healthy", "degraded", "failed"]
```

Use a composition function to set conditions based on resource state.

```yaml
# composition-with-conditions.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-conditions
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  mode: Pipeline
  pipeline:
    - step: provision-resources
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium

    - step: set-conditions
      functionRef:
        name: function-go-templating
      input:
        apiVersion: gotemplating.fn.crossplane.io/v1beta1
        kind: GoTemplate
        source: Inline
        inline:
          template: |
            {{- if and .observed.resources (index .observed.resources "rds-instance") }}
            {{- $rds := index .observed.resources "rds-instance" }}
            {{- if eq $rds.resource.status.atProvider.status "available" }}
            apiVersion: meta.gotemplating.fn.crossplane.io/v1alpha1
            kind: ClaimConditions
            conditions:
              - type: DatabaseAvailable
                status: "True"
                reason: Available
                message: Database is available and accepting connections
                target: CompositeAndClaim
            {{- end }}
            {{- end }}

    - step: automatically-detect-ready-composed-resources
      functionRef:
        name: function-auto-ready
```

Conditions provide detailed health information beyond simple ready status.

## Status Propagation to Claims

For legacy v1 XRDs that define `claimNames`, claims inherit composite resource status.

```yaml
# database-claim.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: app-database
  namespace: production
spec:
  parameters:
    size: medium
  writeConnectionSecretToRef:
    name: app-db-connection
```

Check the claim status.

```bash
kubectl get databaseclaim app-database -n production -o yaml
```

The claim's status includes all fields from the composite resource status.

## Monitoring Status Changes

Track status changes over time. Crossplane does not expose arbitrary custom status fields as Prometheus labels by default; use kube-state-metrics custom resource state metrics or a custom exporter if you want Prometheus metrics from XR status fields.

```yaml
# kube-state-metrics-database-status.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-state-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: kube-state-metrics
  template:
    metadata:
      labels:
        app: kube-state-metrics
    spec:
      containers:
        - name: kube-state-metrics
          image: registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.19.0
          args:
            - --custom-resource-state-config
            - |
              kind: CustomResourceStateMetrics
              spec:
                resources:
                  - groupVersionKind:
                      group: platform.example.com
                      version: "v1alpha1"
                      kind: Database
                    labelsFromPath:
                      name: [metadata, name]
                    metrics:
                      - name: "database_state"
                        help: "Current database state"
                        each:
                          type: StateSet
                          stateSet:
                            labelName: state
                            path: [status, state]
                            list: [provisioning, available, modifying, failed]
```

Create alerting rules from the exported state metric.

```yaml
# prometheus-status-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: crossplane-database-status
  namespace: monitoring
spec:
  groups:
    - name: crossplane-status
      rules:
        # Track database state distribution
        - record: crossplane_database_state_total
          expr: |
            count by (state) (
              kube_customresource_database_state{customresource_kind="Database"} == 1
            )

        # Alert on failed databases
        - alert: CrossplaneDatabaseFailed
          expr: |
            kube_customresource_database_state{customresource_kind="Database",state="failed"} == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Database in failed state"
            description: "Database {{ $labels.name }} is in failed state"

        # Alert on prolonged provisioning
        - alert: CrossplaneDatabaseProvisioningSlow
          expr: |
            kube_customresource_database_state{customresource_kind="Database",state="provisioning"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Database provisioning taking too long"
            description: "Database {{ $labels.name }} has been provisioning for over 30 minutes"
```

Query status in real time.

```bash
# Get all databases with their status
kubectl get database -o custom-columns=\
NAME:.metadata.name,\
STATE:.status.state,\
ENDPOINT:.status.endpoint,\
READY:.status.conditions[?(@.type=='Ready')].status

# Watch status changes
kubectl get database --watch

# Get detailed status
kubectl describe database myapp-database
```

## Status Field Best Practices

Include connection information that applications need. Endpoint URLs, ports, and credentials locations belong in status.

Report health metrics that help diagnose problems. CPU usage, storage utilization, and backup status provide operational insight.

Use consistent naming across different resource types. All databases should use "endpoint" not some using "url" and others using "address".

Set meaningful ready conditions. Ready should indicate the resource is actually usable, not just that it exists.

Include timestamps for important events. Last backup time, last update time, and creation time help with troubleshooting.

## Documenting Status Fields

Add descriptions to status fields in the XRD schema.

```yaml
# xrd-documented-status.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            status:
              type: object
              description: Observed state of the database
              properties:
                endpoint:
                  type: string
                  description: |
                    DNS endpoint for database connections. Use this value in your
                    application connection strings. Example: mydb.abc123.us-west-2.rds.amazonaws.com
                port:
                  type: integer
                  description: |
                    Port number the database listens on. Standard PostgreSQL port is 5432,
                    MySQL is 3306. Use this with the endpoint for full connection details.
                state:
                  type: string
                  description: |
                    Current provisioning state. Values:
                    - provisioning: Database is being created
                    - available: Database is ready for connections
                    - modifying: Configuration changes are being applied
                    - failed: Provisioning or modification failed, check events for details
```

Users can read descriptions through kubectl explain.

```bash
kubectl explain database.status.endpoint
kubectl explain database.status.state
```

## Summary

Composite resource status communicates infrastructure state to users. Define custom status fields in your XRD schema. Use ToCompositeFieldPath patches to copy values from managed resources. Set readiness checks to control when resources report as ready.

Status provides observability without requiring users to understand Crossplane internals. Applications check claim status to know when infrastructure is ready. Platform teams monitor status metrics to track provisioning success rates. Operations teams use status conditions to diagnose problems.

Good status design makes your platform self-documenting. Include the information users need to connect to and operate their infrastructure. Add health indicators that surface problems early. Document status fields so users understand what each value means.
