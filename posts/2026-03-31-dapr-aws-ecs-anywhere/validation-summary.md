# Validation Summary: How to Use Dapr with AWS ECS Anywhere

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar, self-hosted mode)
- AWS ECS Anywhere (EXTERNAL launch type)
- AWS ECS task definitions
- Redis state store (AWS ElastiCache)
- mDNS and Consul service discovery
- Docker containers

## Sources Consulted
- AWS ECS Anywhere registration docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-registration.html
- AWS ECS Anywhere workloads docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-runtask.html
- AWS ECS launch type (EXTERNAL) docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch-type-external.html
- AWS ECS HealthCheck API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_HealthCheck.html
- AWS ECS ContainerDependency API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDependency.html
- AWS ECS Cluster Query Language: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-query-language.html
- Dapr daprd CLI reference and source code (cmd/daprd/options/options.go)
- Dapr health API documentation
- Dapr Redis state store component reference
- Dapr name resolution documentation (mDNS and Consul)
- Docker Hub daprio/daprd tags

## Issues Found

1. **Incorrect ECS Anywhere install script URL**: The URL was `https://amazon-ecs-agent.s3.amazonaws.com/ecs-anywhere-install.sh` but the correct URL is `https://amazon-ecs-agent.s3.amazonaws.com/ecs-anywhere-install-latest.sh` (missing `-latest` in the filename). The original URL returns HTTP 403 Forbidden. Fixed.

2. **Deprecated `--components-path` flag**: The `--components-path` flag for daprd has been deprecated in favor of `--resources-path`. While the old flag still works as an alias, the blog should use the current flag name. Changed to `--resources-path`.

3. **Outdated Dapr image version**: The image `daprio/daprd:1.14.0` (released 2024-08-14) was significantly outdated. Updated to `daprio/daprd:1.17.4`, the current latest stable release.

## Review Notes
- The task definition uses `networkMode: "host"`, which is valid for ECS Anywhere but not required. The `bridge` mode is also supported and is more commonly shown in AWS official examples. Host mode is a reasonable choice here since it simplifies localhost communication between the app and Dapr sidecar, but readers should know `bridge` is also an option.
- The `daprd` container is marked `"essential": false`, which is a deliberate pattern — if the sidecar crashes, the app container can continue running (or be restarted). This is a valid design choice.
- mDNS is noted as the default name resolution for Dapr self-hosted mode and technically does not need explicit configuration. The post correctly shows it for clarity. The caveat that mDNS may not work in cloud provider virtual networks is worth noting.
- The `cat > /opt/dapr/components/statestore.yaml` command requires root or sudo, which is not shown (though the `mkdir -p` above does use sudo). Minor oversight but not blocking.
