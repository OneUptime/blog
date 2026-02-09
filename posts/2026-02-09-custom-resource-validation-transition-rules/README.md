# How to Implement Custom Resource Validation with Transition Rules in CEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Validation

Description: Learn how to use CEL transition rules in Custom Resource Definitions to validate state changes, enforce update constraints, and prevent invalid modifications to your custom resources.

---

When validating custom resources, you often need to ensure that updates follow certain rules. For example, you might want to prevent reducing storage size, disallowing changing database engine types after creation, or requiring approval before certain state transitions. CEL transition rules in CRDs make these validations possible without webhooks.

## Understanding Transition Rules

Transition rules use CEL expressions that have access to both the current and previous state of a resource through two special variables:

- `self`: The new value being proposed
- `oldSelf`: The existing value before the update

This allows you to write validation rules that compare before and after states.

## Basic Transition Rule Syntax

Here is a simple example preventing storage size reduction:

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
              storageGB:
                type: integer
                minimum: 1
            x-kubernetes-validations:
            # This rule only applies during updates
            - rule: "!has(oldSelf.storageGB) || self.storageGB >= oldSelf.storageGB"
              message: "Storage size cannot be decreased"
```

The `!has(oldSelf.storageGB)` check ensures the rule passes during creation when `oldSelf` does not exist yet.

## Preventing Field Modifications After Creation

Some fields should be immutable after resource creation:

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
              engine:
                type: string
                enum: ["postgres", "mysql", "mongodb"]
              region:
                type: string
              version:
                type: string
            x-kubernetes-validations:
            # Engine cannot be changed after creation
            - rule: "!has(oldSelf.engine) || self.engine == oldSelf.engine"
              message: "Database engine cannot be changed after creation"

            # Region cannot be changed after creation
            - rule: "!has(oldSelf.region) || self.region == oldSelf.region"
              message: "Database region cannot be changed after creation"

            # Version can only be upgraded, not downgraded
            - rule: "!has(oldSelf.version) || self.version >= oldSelf.version"
              message: "Database version can only be upgraded, not downgraded"
```

## Validating State Transitions

Control which state transitions are allowed:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: workloads.example.com
spec:
  group: example.com
  names:
    kind: Workload
    plural: workloads
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
              state:
                type: string
                enum: ["draft", "pending", "approved", "deployed", "failed"]
            x-kubernetes-validations:
            # Can only go from draft to pending
            - rule: |
                !has(oldSelf.state) ||
                oldSelf.state != 'draft' ||
                self.state in ['draft', 'pending']
              message: "From draft state, can only transition to pending"

            # Can only go from pending to approved or failed
            - rule: |
                !has(oldSelf.state) ||
                oldSelf.state != 'pending' ||
                self.state in ['pending', 'approved', 'failed']
              message: "From pending state, can only transition to approved or failed"

            # Cannot go back to draft once approved
            - rule: |
                !has(oldSelf.state) ||
                oldSelf.state != 'approved' ||
                self.state != 'draft'
              message: "Cannot return to draft state after approval"
```

## Requiring Approval for Dangerous Changes

Enforce that users acknowledge dangerous operations:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: clusters.example.com
spec:
  group: example.com
  names:
    kind: Cluster
    plural: clusters
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
              nodeCount:
                type: integer
                minimum: 1
              deleteProtection:
                type: boolean
              forceDelete:
                type: boolean
            x-kubernetes-validations:
            # Cannot reduce node count by more than 50% without approval
            - rule: |
                !has(oldSelf.nodeCount) ||
                self.nodeCount >= oldSelf.nodeCount * 0.5 ||
                has(self.forceDelete) && self.forceDelete == true
              message: "Cannot reduce node count by more than 50% without setting forceDelete=true"

            # Cannot disable delete protection if it was enabled
            - rule: |
                !has(oldSelf.deleteProtection) ||
                !oldSelf.deleteProtection ||
                self.deleteProtection == true
              message: "Delete protection cannot be disabled once enabled"
```

## Validating Dependent Fields During Updates

Ensure related fields are updated together:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
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
              imageTag:
                type: string
              configVersion:
                type: integer
            x-kubernetes-validations:
            # If image changes, imageTag must also change
            - rule: |
                !has(oldSelf.image) ||
                self.image == oldSelf.image ||
                self.imageTag != oldSelf.imageTag
              message: "If image changes, imageTag must also be updated"

            # Config version must increment when changed
            - rule: |
                !has(oldSelf.configVersion) ||
                self.configVersion >= oldSelf.configVersion
              message: "Config version must increase or stay the same"
```

## Rate Limiting Changes

Prevent too frequent modifications:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: scalableservices.example.com
spec:
  group: example.com
  names:
    kind: ScalableService
    plural: scalableservices
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
              replicas:
                type: integer
              lastScaleTime:
                type: string
                format: date-time
            x-kubernetes-validations:
            # Can only scale every 5 minutes
            - rule: |
                !has(oldSelf.replicas) ||
                self.replicas == oldSelf.replicas ||
                !has(oldSelf.lastScaleTime) ||
                (timestamp(self.lastScaleTime) - timestamp(oldSelf.lastScaleTime)) >= duration('5m')
              message: "Can only change replicas once every 5 minutes"
```

Note: This requires the user to update `lastScaleTime` when scaling.

## Complex Transition Logic

Combine multiple conditions for sophisticated validation:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: deployments.example.com
spec:
  group: example.com
  names:
    kind: ManagedDeployment
    plural: manageddeployments
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
              environment:
                type: string
                enum: ["dev", "staging", "production"]
              replicas:
                type: integer
              allowDownscale:
                type: boolean
            x-kubernetes-validations:
            # Production deployments cannot be downscaled without explicit permission
            - rule: |
                !has(oldSelf.environment) ||
                !has(oldSelf.replicas) ||
                self.environment != 'production' ||
                self.replicas >= oldSelf.replicas ||
                (has(self.allowDownscale) && self.allowDownscale == true)
              message: "Production deployments cannot be downscaled without setting allowDownscale=true"

            # Cannot change environment directly from production to dev
            - rule: |
                !has(oldSelf.environment) ||
                !(oldSelf.environment == 'production' && self.environment == 'dev')
              message: "Cannot change environment directly from production to dev (use staging first)"

            # If moving to production, must have at least 2 replicas
            - rule: |
                !has(oldSelf.environment) ||
                self.environment != 'production' ||
                oldSelf.environment == 'production' ||
                self.replicas >= 2
              message: "Must have at least 2 replicas when promoting to production"
```

## Field-Level Transition Rules

Apply transition rules to nested fields:

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
              backup:
                type: object
                properties:
                  enabled:
                    type: boolean
                  retentionDays:
                    type: integer
                x-kubernetes-validations:
                # Once backups are enabled, they cannot be disabled
                - rule: |
                    !has(oldSelf.enabled) ||
                    !oldSelf.enabled ||
                    self.enabled == true
                  message: "Backups cannot be disabled once enabled"

                # Retention days can only increase
                - rule: |
                    !has(oldSelf.retentionDays) ||
                    self.retentionDays >= oldSelf.retentionDays
                  message: "Backup retention period can only be increased"
```

## Using Transition Rules with List Fields

Validate changes to lists:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: accesscontrols.example.com
spec:
  group: example.com
  names:
    kind: AccessControl
    plural: accesscontrols
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
              allowedUsers:
                type: array
                items:
                  type: string
            x-kubernetes-validations:
            # Cannot remove users, only add
            - rule: |
                !has(oldSelf.allowedUsers) ||
                oldSelf.allowedUsers.all(user, user in self.allowedUsers)
              message: "Cannot remove users from the allowed list, only add new ones"

            # Must have at least one admin user
            - rule: |
                self.allowedUsers.exists(user, user.startsWith('admin-'))
              message: "Must have at least one admin user in the allowed list"
```

## Best Practices

1. **Check for oldSelf existence**: Always use `!has(oldSelf.field)` to handle creation

2. **Write clear error messages**: Explain what is wrong and what to do

3. **Test thoroughly**: Test create, update, and edge cases

4. **Document transition rules**: Comment complex rules in your CRD

5. **Consider user experience**: Provide escape hatches for legitimate use cases

6. **Validate early**: Catch invalid transitions before they reach your controller

7. **Combine with admission policies**: Use both CRD validation and ValidatingAdmissionPolicy for defense in depth

## Testing Transition Rules

```bash
# Create a database
kubectl apply -f - <<EOF
apiVersion: example.com/v1
kind: Database
metadata:
  name: test-db
spec:
  engine: postgres
  storageGB: 100
EOF

# Try to reduce storage (should fail)
kubectl patch database test-db --type=merge -p '{"spec":{"storageGB":50}}'
# Error: Storage size cannot be decreased

# Try to change engine (should fail)
kubectl patch database test-db --type=merge -p '{"spec":{"engine":"mysql"}}'
# Error: Database engine cannot be changed after creation

# Increase storage (should succeed)
kubectl patch database test-db --type=merge -p '{"spec":{"storageGB":200}}'
```

## Conclusion

CEL transition rules in CRDs provide powerful validation capabilities for controlling how resources can be updated. By comparing current and previous states, you can enforce immutability, validate state machines, require approval for dangerous operations, and prevent invalid transitions, all without deploying admission webhooks. These declarative validation rules improve data integrity, provide immediate feedback to users, and reduce the complexity of your operators by moving validation logic into the API server itself.
