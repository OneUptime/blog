# Validation Summary: How to Preserve Drone Test Reports and Build Artifacts After Ephemeral Workspaces Disappear

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone CI Docker pipelines and ephemeral workspaces
- Drone step conditions, dependency graphs, and environment variables
- Drone server blob storage
- Python 3
- AWS CLI v2
- Amazon S3 object storage, encryption, and lifecycle retention
- SHA-256 artifact checksums

## Sources Consulted
- [Drone workspace documentation](https://docs.drone.io/pipeline/docker/syntax/workspace/)
- [Drone step conditions documentation](https://docs.drone.io/pipeline/docker/syntax/conditions/)
- [Drone Docker pipeline YAML reference](https://docs.drone.io/yaml/docker/)
- [Drone server blob storage documentation](https://docs.drone.io/server/storage/blob/)
- [Drone pipeline environment variable reference](https://docs.drone.io/pipeline/environment/reference/)
- [Drone `DRONE_REPO` reference](https://docs.drone.io/pipeline/environment/reference/drone-repo/)
- [Drone `DRONE_BUILD_NUMBER` reference](https://docs.drone.io/pipeline/environment/reference/drone-build-number/)
- [Drone `DRONE_STAGE_NUMBER` reference](https://docs.drone.io/pipeline/environment/reference/drone-stage-number/)
- [Drone `DRONE_COMMIT_SHA` reference](https://docs.drone.io/pipeline/environment/reference/drone-commit-sha/)
- [AWS CLI v2 `s3 cp` command reference](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html)
- [Amazon S3 lifecycle configuration elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html)

## Issues Found
No technical issues found.

## Review Notes
The Python example is syntactically valid and correctly treats the final index object as an application-level completion marker rather than an S3 multi-object transaction. Its warning that the symlink checks do not protect against concurrent hostile filesystem mutation is accurate. The upload prefix uses documented Drone variables, and `when.status` with both `success` and `failure` is valid Drone syntax. No product versions are pinned beyond AWS CLI v2; the referenced interfaces are current as of validation.
