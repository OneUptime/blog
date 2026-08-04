# Layer Provider-Neutral IaC Without Losing Cloud Capabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure as Code, Terraform, Cloud Portability, Platform Engineering, Terraform Modules, Multi-Cloud, Architecture

Description: Use intent contracts, provider implementations, environment composition, and capability tests to keep IaC portable without reducing every cloud to common-denominator resources.

---

Provider-neutral infrastructure as code should not mean identical resource files for every cloud. AWS, Azure, and Google Cloud expose different security, network, availability, and managed-service models. Flattening them into one generic resource schema either discards useful features or leaks provider fields through an untyped escape hatch.

A layered pattern keeps organizational intent stable and provider details first-class.

## Use Four Layers

```text
Layer 1: workload intent and service contract
Layer 2: provider-specific implementation modules
Layer 3: environment composition and provider configuration
Layer 4: policy, contract tests, and operational evidence
```

Each layer has a different reason to change.

### Layer 1: intent

Define what the workload needs:

```hcl
variable "service" {
  type = object({
    name                 = string
    exposure             = string
    availability         = string
    data_classification  = string
    log_retention_days   = number
    private_dependencies = list(string)
  })

  validation {
    condition     = contains(["private", "public"], var.service.exposure)
    error_message = "Exposure must be private or public."
  }
}
```

The contract should say `zone-redundant private service`, not `three subnets and an application load balancer`. Avoid provider SKU names at this layer.

### Layer 2: implementation

Create independent modules:

```text
modules/service-aws/
modules/service-azure/
modules/service-gcp/
```

Each uses native resources and can exploit native features. The AWS implementation might use an Application Load Balancer and target groups; Azure might use Application Gateway; Google Cloud might use a regional or global load-balancing design. Their internal resources need not match.

They return comparable workload-facing outputs:

```hcl
output "service_contract" {
  value = {
    endpoint        = local.endpoint
    identity_mode   = "workload_federation"
    availability    = local.provided_availability
    telemetry_otlp  = local.otlp_endpoint
  }
}
```

### Layer 3: composition

Root modules select the provider implementation, configure providers, connect shared services, and own state:

```text
environments/prod-aws/
  providers.tf
  service.tf
  backend.tf

environments/evacuation-gcp/
  providers.tf
  service.tf
  backend.tf
```

Separate roots and state reduce blast radius. Changing a target selector must never propose deleting one cloud and creating another as a single routine apply.

### Layer 4: governance and evidence

Policy checks organizational requirements; tests prove the module contract; monitoring verifies continued behavior. This layer converts module conventions into an enforceable platform product.

## Make the Interface Comparable, Not Identical

Terraform has no formal module interface declaration. Establish a repository convention and verify it.

A shared contract can specify:

```yaml
inputs:
  service: object
  network_contract: object
outputs:
  service_contract:
    endpoint: string
    identity_mode: string
    availability: string
capabilities:
  private_ingress: required
  waf: optional
  global_anycast: optional
```

Every implementation accepts and returns these shapes. A test applies representative input and checks observable behavior.

Do not expose dozens of nullable provider parameters in the core interface. Optional provider enhancements can use typed extension objects at the implementation call site:

```hcl
module "service" {
  source  = "../../modules/service-aws"
  service = local.service_intent

  aws_features = {
    waf_managed_rule_groups = ["baseline"]
    deletion_protection     = true
  }
}
```

This is intentionally not accepted by the Azure module. The feature is visible as an AWS enhancement, and the portability score can reflect its replacement work.

## Report Capabilities Explicitly

An implementation should fail when a required intent cannot be met and report optional capabilities:

```hcl
output "capabilities" {
  value = {
    zone_redundant      = local.zone_count >= 3
    managed_waf         = var.aws_features.waf_enabled
    deletion_protection = var.aws_features.deletion_protection
    ipv6_ingress        = local.ipv6_enabled
  }

  precondition {
    condition     = var.service.availability != "zone-redundant" || local.zone_count >= 2
    error_message = "Selected region and design do not meet zone-redundant intent."
  }
}
```

An output precondition stops the operation when the required contract is false. A Terraform `check` block is appropriate for non-blocking health observations, but a failed check reports a warning and continues.

The precise zone count required should come from the organization's contract and the provider service's documented behavior. More zones in configuration do not automatically prove service-level resilience.

## Keep Provider Configuration at the Root

Reusable child modules declare provider requirements; root modules configure credentials, regions, and aliases. HashiCorp documents that provider configurations are global to the overall configuration and should be passed into children when aliases are required.

```hcl
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 6.0"
      configuration_aliases = [aws.audit]
    }
  }
}
```

Version constraints in reusable modules should express a compatible minimum. The root selects tested versions and commits its dependency lock file. Test upgrades deliberately.

## Separate Foundation, Platform, and Workload State

Layer state by lifecycle and authority:

```text
organization and identity foundation
network and security foundation
shared cluster or application platform
workload data services
workload deployment
```

Avoid broad remote-state coupling. Publish a small, versioned contract through an approved configuration mechanism when a downstream stack needs values such as network IDs or endpoints.

State isolation is not merely organization. It lets a migration create the target alongside the source, validate it, move data, and decommission later under separate approval.

## Use Native Policy at the Right Layer

Stable policy can state:

```text
public storage is denied
confidential data uses approved encryption
production spans failure domains
logs are retained for 90 days
workloads use short-lived identity
```

Provider implementations translate these outcomes into native IAM, keys, network controls, and logging. Review native plans because translation can be wrong even when the intent is sound.

Avoid one universal IAM document. Provider authorization semantics, resource hierarchies, and condition languages differ too much for a faithful lowest-common-denominator policy.

## Test Structure and Behavior

Use several test levels:

1. variable validation and plan assertions with `terraform test`;
2. mocked providers for module logic that does not need real API behavior;
3. real apply in isolated provider test environments;
4. service contract tests for network access, identity, encryption, availability, and deletion;
5. upgrade and destroy tests;
6. cross-provider workload tests against normalized outputs.

HashiCorp warns that `terraform test` can create real infrastructure. Use dedicated accounts, budgets, restrictive policies, run identifiers, and independent cleanup alerts.

## Promote Implementations with the Contract

Release the intent contract and its provider implementations as one tested compatibility set. For every candidate release, record the Terraform and provider versions, module revisions, representative inputs, normalized outputs, and behavioral test results. Compare normalized fields such as endpoint reachability, identity mode, encryption intent, and availability outcome; do not compare raw provider plans as if different resource graphs should be identical.

Promote a provider implementation only after the same consumer fixture can plan against it and the isolated apply suite proves the required behavior. If an optional native capability changes, update the capability report and portability score without silently changing the core promise. This gives application teams a concrete compatibility matrix and lets the platform team roll back one implementation without pretending that all clouds share a release lifecycle.

## Handle Refactoring and Migration Separately

Terraform `moved` blocks preserve resource addresses during configuration refactoring when the underlying move is supported. Import blocks can bring existing resources under management. Neither converts an AWS resource into its Azure or Google equivalent or moves application data.

A provider migration is a parallel deployment workflow:

```text
apply target state
validate target contract
seed and replicate data
cut traffic
observe
retire source state and resources
```

Do not use a cross-cloud state move to create the appearance that different remote objects are the same resource.

## Official Documentation

- [Terraform module composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition)
- [Providers within Terraform modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers)
- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform test command](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform validation, preconditions, and checks](https://developer.hashicorp.com/terraform/language/validate)
- [Terraform refactoring with moved blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform import blocks](https://developer.hashicorp.com/terraform/language/import)

## Conclusion

Provider-neutral IaC works when intent, implementation, composition, and evidence are separate layers. Let each cloud use its strengths, expose optional native features clearly, and require every implementation to satisfy a small workload contract. Portability comes from replaceable, tested modules and isolated state—not from a fictional generic cloud resource.
