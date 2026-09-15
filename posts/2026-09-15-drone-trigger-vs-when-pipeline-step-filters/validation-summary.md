# Validation Summary: `trigger` vs. `when` in Drone: How to Filter Pipelines and Individual Steps Correctly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone CI
- Docker pipelines and plugins
- YAML
- Node.js and npm
- Git branches, tags, and references

## Sources Consulted
- [Drone Docker pipeline triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/)
- [Drone pipeline step conditions](https://docs.drone.io/pipeline/conditions/)
- [Drone Docker pipeline steps and failure handling](https://docs.drone.io/pipeline/docker/syntax/steps/)
- [Drone Docker pipeline parallelism and dependencies](https://docs.drone.io/pipeline/docker/syntax/parallelism/)
- [Drone Docker pipeline YAML reference](https://docs.drone.io/yaml/docker/)
- [Drone repository secret policy](https://docs.drone.io/secret/repository/)

## Issues Found
No technical issues found.

## Review Notes
The examples intentionally use floating major or default image tags (`node:24`, `alpine:3`, and `plugins/docker`); the post already advises adopters to pin approved versions or digests. The Docker publishing step also correctly notes its external prerequisites, including a Dockerfile, repository secrets, and compatible runner configuration.
