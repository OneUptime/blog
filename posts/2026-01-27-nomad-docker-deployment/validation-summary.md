# Validation Summary: How to Deploy Docker Containers on Nomad

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- HashiCorp Nomad
- Docker task driver
- HCL job specifications
- Consul service discovery and service mesh
- Nomad Autoscaler
- Nomad health checks, resources, constraints, affinity, and networking
- Vault integration

## Sources Consulted
- HashiCorp Nomad Docker task driver documentation: https://developer.hashicorp.com/nomad/docs/job-declare/task-driver/docker
- HashiCorp Nomad resources block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/resources
- HashiCorp Nomad scaling block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/scaling
- HashiCorp Nomad Autoscaler policy documentation: https://developer.hashicorp.com/nomad/tools/autoscaling/policy
- HashiCorp Nomad Autoscaler Nomad APM plugin documentation: https://developer.hashicorp.com/nomad/tools/autoscaling/plugins/apm/nomad
- HashiCorp Nomad network block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/network
- HashiCorp Nomad service block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/service
- HashiCorp Nomad check block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/check
- HashiCorp Nomad constraint block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/constraint
- HashiCorp Nomad update and task documentation: https://developer.hashicorp.com/nomad/docs/job-specification/update and https://developer.hashicorp.com/nomad/docs/job-specification/task

## Issues Found
- The resource snippet described task-level scaling as horizontal pod autoscaling and used an unlabeled `scaling` block inside a `task`. Horizontal application scaling belongs at the group level in Nomad. Updated the example to place the `scaling` block in an enclosing `group` block and changed the wording from pod autoscaling to application scaling.
- The memory comments implied `memory` remained the hard limit when `memory_max` was set and described `memory_max` as a soft limit. Nomad treats `memory` as the reservation when `memory_max` is set, and `memory_max` is the hard limit. Updated those comments.
- The service discovery text said services are registered and deregistered based on health status. Nomad registers services with the configured provider as allocations start and stop; checks report health/readiness. Reworded the explanation.
- The health-check overview said Nomad supports HTTP, TCP, gRPC, and script checks without distinguishing providers. The Nomad service provider supports HTTP and TCP; Consul supports HTTP, TCP, gRPC, and script checks. Added the provider-specific caveat.
- The HTTP health check comment referred to checking response bodies, but the shown `check_restart` block controls restarts after unhealthy checks. Updated the comment.
- The health-check best practice only mentioned HTTP and TCP checks. Updated it to include gRPC as an appropriate service check type when supported by the service provider.
- The resource-limit best practice said setting `memory` and `memory_max` prevents OOM kills. Updated it to state that `memory` sets the reservation and `memory_max` sets the hard limit for controlled bursting.

## Review Notes
The Docker driver, networking, service, metadata, gRPC health check, script health check, update, restart, kill timeout, spread, affinity, and `distinct_hosts` examples align with the current Nomad documentation. `memory_max` requires memory oversubscription support/enabling in the Nomad scheduler, so operators should verify cluster configuration before relying on bursting behavior.
