# Validation Summary: How to Configure Nomad Resource Constraints

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HashiCorp Nomad
- Nomad job specifications
- Nomad resource constraints
- Docker task driver
- HCL configuration

## Sources Consulted
- HashiCorp Nomad resources block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/resources
- HashiCorp Nomad Docker task driver documentation: https://developer.hashicorp.com/nomad/docs/job-declare/task-driver/docker
- HashiCorp Nomad constraint block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/constraint
- HashiCorp Nomad runtime variable interpolation documentation: https://developer.hashicorp.com/nomad/docs/reference/runtime-variable-interpolation
- HashiCorp Nomad allocation placement documentation: https://developer.hashicorp.com/nomad/docs/concepts/scheduling/placement

## Issues Found
- The post described CPU as "MHz shares." Nomad documents `cpu` as the CPU required to run the task in MHz, so the wording was changed to "specified in MHz."
- The post described `memory` as a guaranteed reservation without explaining the default hard-limit behavior. Nomad documents `memory` as the hard limit unless `memory_max` is set, at which point `memory` becomes the reservation. The description was corrected.
- The post said `memory_max` simply caps memory and Nomad kills the task. Nomad documents this as a hard limit for supported drivers, with the operating system typically terminating tasks that exceed it. The wording was updated.
- The heading and explanation for CPU bursting implied `cpu` and `cores` could be used together. Nomad documents that validation fails if both are defined in the same `resources` block. The section was corrected to explain that `cores` reserves CPU cores exclusively and cannot be combined with `cpu`.

## Review Notes
The HCL snippets are structurally valid for the documented placements. The `memory_max` guidance is driver-dependent; the post now notes that it applies to supported task drivers without expanding into a new compatibility section.
