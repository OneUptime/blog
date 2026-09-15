# Validation Summary: How to Run Drone Pipelines in Sequence with `depends_on` Without Accidental Parallelism

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Drone CI
- Docker pipelines
- YAML multi-document configuration
- CI/CD dependency graphs
- Pipeline and step `depends_on`

## Sources Consulted
- [Drone pipeline configuration](https://docs.drone.io/pipeline/configuration/)
- [Drone Docker pipeline step parallelism](https://docs.drone.io/pipeline/docker/syntax/parallelism/)
- [Drone Docker pipeline steps](https://docs.drone.io/pipeline/docker/syntax/steps/)
- [Drone Docker pipeline workspace](https://docs.drone.io/pipeline/docker/syntax/workspace/)
- [Drone Docker pipeline triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/)
- [Drone Docker pipeline data structures](https://docs.drone.io/yaml/docker/)

## Issues Found
No technical issues found.

## Review Notes
Both YAML examples parse successfully. The multi-pipeline example correctly uses top-level `depends_on` with unique pipeline names and matching event triggers. The step example correctly declares a complete directed acyclic graph, uses an empty dependency list for the root step, fans out independent work, and joins it before packaging. The descriptions of pipeline workspace isolation, shared workspace state between steps, skipped-step graph correction, and `failure: ignore` agree with the official Drone documentation. All referenced documentation URLs returned successfully during validation.
